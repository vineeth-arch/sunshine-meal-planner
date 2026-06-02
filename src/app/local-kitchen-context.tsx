import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import { useAuth } from '../features/auth/use-auth'
import type {
  DayKey,
  Dish,
  Ingredient,
  Integrations,
  KitchenImportStats,
  KitchenSyncState,
  LocalKitchenState,
  MigrationPreview,
  MigrationSummary,
  PantryItem,
  Staple,
  WeeklyPlan,
} from '../types/domain'
import {
  computeIngredientsNeeded,
  copyDayPlan,
  generatePlanFromFridge,
  getDishById,
  getOverlappingDishes,
  loadKitchenState,
  suggestDishesFromIngredients,
  syncIngredientsFromRepo,
  updateMealSlot,
} from '../services/local/kitchen'
import {
  buildExportPayload,
  parseImportPayload,
} from '../services/local/importExportService'
import {
  compressImage,
  deleteDishImage,
  deleteIngredientImage,
  getIngredientImage,
  saveDishImage,
  saveIngredientImage,
} from '../services/local/indexedDbImageService'
import {
  persistIngredients,
  persistIntegrations,
  persistLastWeekPlan,
  persistPlan,
  persistRepo,
  persistStaples,
  readRawStorageValue,
} from '../services/local/localStorageService'
import { listDishImagesAsDataUrls, listIngredientImagesAsDataUrls } from '../services/local/imageStore'
import { canEdit, isAdmin, isSuperadmin } from '../features/auth/access'
import { isMockAuthEnabled } from '../features/auth/test-auth'
import { isCloudConfigured, supabase } from '../lib/supabase'
import { getDishes, createDish, deleteDish as deleteDishDocument, updateDish } from '../services/supabase/dishes'
import {
  createIngredient,
  deleteIngredient as deleteIngredientDocument,
  getIngredientId,
  getIngredients,
  updateIngredient,
} from '../services/supabase/ingredients'
import { deletePantryItem, getPantryItems, upsertPantryItem } from '../services/supabase/pantry'
import { deleteStaple, getStaples, getStapleId, upsertStaple } from '../services/supabase/staples'
import { buildWeeklyPlanFromSlots, getWeeklyPlan, saveWeeklyPlan } from '../services/supabase/weeklyPlans'
import { getWeekStartDate } from '../lib/date/plans'

type DishDraft = Omit<Dish, 'id'> & { id?: string }
type IngredientDraft = Ingredient & { previousName?: string }
type RealtimeDataRow = {
  household_id?: string
  updated_by?: string | null
}
type RealtimePayload = {
  new: RealtimeDataRow | null
  old: RealtimeDataRow | null
}

type FridgePlanResult = {
  filledCount: number
  makeableCount: number
}

type LocalKitchenContextValue = {
  state: LocalKitchenState
  exportJson: string
  loading: boolean
  error: string | null
  syncState: KitchenSyncState
  syncMessage: string | null
  canEditData: boolean
  canImportExport: boolean
  refreshData(): Promise<void>
  setPlan(nextPlan: WeeklyPlan): Promise<void>
  setIntegrations(integrations: Integrations): void
  saveDish(draft: DishDraft, imageFile?: File | null, removeLocalImage?: boolean): Promise<void>
  deleteDish(id: string): Promise<void>
  saveIngredient(draft: IngredientDraft, imageFile?: File | null, removeLocalImage?: boolean): Promise<void>
  deleteIngredient(name: string): Promise<void>
  addStaple(name: string): Promise<void>
  removeStaple(name: string): Promise<void>
  updatePantryItem(item: PantryItem): Promise<void>
  updateSlot(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string, value: string | string[]): Promise<void>
  clearSlot(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string): Promise<void>
  copyDay(fromDay: DayKey, toDay: DayKey): Promise<void>
  clearDay(day: DayKey): Promise<void>
  importJson(text: string): Promise<KitchenImportStats>
  runFridgePlan(available: string[], includeGujarati: boolean): Promise<FridgePlanResult>
  suggestFromIngredients(available: string[]): Dish[]
  getDishById(id: string): Dish | null
  getOverlappingDishes(dishId: string): ReturnType<typeof getOverlappingDishes>
  getIngredientsNeeded(scope: 'today' | 'tomorrow' | 'week' | DayKey): ReturnType<typeof computeIngredientsNeeded>
  getMigrationPreview(): Promise<MigrationPreview>
  runLegacyMigration(): Promise<MigrationSummary>
}

const CATEGORY_COLORS: Record<Dish['category'], string> = {
  sabji: '#d4edda',
  curry: '#fff3cd',
  gujarati: '#e2d9f3',
}

const LocalKitchenContext = createContext<LocalKitchenContextValue | null>(null)

function normalizeDishDraft(draft: DishDraft, existing?: Dish | null): Dish {
  return {
    id: draft.id ?? existing?.id ?? `${draft.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
    name: draft.name.trim(),
    category: draft.category,
    mainIngredients: draft.mainIngredients.map((item) => item.trim()).filter(Boolean),
    emoji: draft.emoji.trim() || existing?.emoji || '🥗',
    bgColor: draft.bgColor || existing?.bgColor || CATEGORY_COLORS[draft.category],
    referenceText: draft.referenceText?.trim() ?? '',
    recipe: draft.recipe?.trim() ?? '',
    youtube: draft.youtube?.trim() ?? '',
    image: draft.image?.trim() ?? '',
  }
}

function normalizeIngredientDraft(draft: IngredientDraft): Ingredient {
  return {
    name: draft.name.trim(),
    emoji: draft.emoji.trim() || '🥗',
    malayalam: draft.malayalam?.trim() ?? '',
    gujarati: draft.gujarati?.trim() ?? '',
    image: draft.image?.trim() ?? '',
  }
}

function derivePantryItems(
  ingredients: Ingredient[],
  staples: Staple[],
  storedPantry: Array<{ id: string; ingredientId: string; kind: 'ingredient' | 'staple'; name: string; quantity: string; unit: string; status: string }>,
): PantryItem[] {
  const pantryById = new Map(storedPantry.map((item) => [item.ingredientId, item]))

  const ingredientItems = ingredients.map((ingredient) => {
    const id = getIngredientId(ingredient.name)
    const pantry = pantryById.get(id)

    return {
      id,
      kind: 'ingredient' as const,
      name: ingredient.name,
      emoji: ingredient.emoji || '🥗',
      detail: [ingredient.malayalam, ingredient.gujarati].filter(Boolean).join(' · '),
      image: ingredient.image,
      quantity: pantry?.quantity ?? '',
      unit: pantry?.unit ?? '',
      status: pantry?.status ?? 'unknown',
    }
  })

  const stapleItems = staples.map((staple) => {
    const id = getStapleId(staple)
    const pantry = pantryById.get(id)

    return {
      id,
      kind: 'staple' as const,
      name: staple,
      emoji: '🧂',
      detail: 'Staple pantry item',
      quantity: pantry?.quantity ?? '',
      unit: pantry?.unit ?? '',
      status: pantry?.status ?? 'available',
    }
  })

  return [...ingredientItems, ...stapleItems].sort((left, right) => left.name.localeCompare(right.name))
}

function persistCache(state: LocalKitchenState) {
  persistRepo(state.repo)
  persistIngredients(state.ingredients)
  persistStaples(state.staples)
  persistPlan(state.plan)
  persistLastWeekPlan(state.lastWeekPlan)
}

function mapCloudDishToDomain(dish: Awaited<ReturnType<typeof getDishes>>[number]): Dish {
  return {
    id: dish.id,
    name: dish.name,
    category: dish.category,
    mainIngredients: dish.mainIngredients,
    emoji: dish.emoji,
    bgColor: CATEGORY_COLORS[dish.category],
    referenceText: dish.referenceText,
    recipe: dish.recipe,
    youtube: dish.youtubeUrl,
    image: dish.imageUrl,
  }
}

function mapCloudIngredientToDomain(ingredient: Awaited<ReturnType<typeof getIngredients>>[number]): Ingredient {
  return {
    name: ingredient.name,
    emoji: ingredient.emoji,
    malayalam: ingredient.malayalamName,
    gujarati: ingredient.gujaratiName,
    image: ingredient.imageUrl,
  }
}

export function LocalKitchenProvider({ children }: PropsWithChildren) {
  const mockAuthEnabled = isMockAuthEnabled()
  const auth = useAuth()
  const [state, setState] = useState<LocalKitchenState>(() => loadKitchenState())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<KitchenSyncState>('idle')
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const saveTimeoutRef = useRef<number | null>(null)
  const canEditData = isCloudConfigured() && online && Boolean(auth.user && auth.profile) && canEdit(auth.profile)
  const canImportExport = isAdmin(auth.profile) || isSuperadmin(auth.profile)

  const requireWriteAccess = useCallback(() => {
    if (!isCloudConfigured() || !auth.user || !auth.profile) {
      throw new Error('Connect to edit.')
    }

    if (!online) {
      throw new Error('Connect to edit.')
    }

    if (!canEdit(auth.profile)) {
      throw new Error('Connect to edit. This profile is read-only.')
    }
  }, [auth.profile, auth.user, online])

  const setSavedState = useCallback((message: string) => {
    setSyncState('saved')
    setSyncMessage(message)

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      setSyncState('idle')
      setSyncMessage(null)
    }, 2500)
  }, [])

  const setFailedState = useCallback((message: string) => {
    setSyncState('failed')
    setSyncMessage(message)
  }, [])

  const runWrite = useCallback(async <T,>(message: string, operation: () => Promise<T>) => {
    requireWriteAccess()
    setSyncState('saving')
    setSyncMessage('Saving...')

    try {
      const result = await operation()
      setSavedState(message)
      return result
    } catch (caught) {
      setFailedState(caught instanceof Error ? caught.message : 'Save failed.')
      throw caught
    }
  }, [requireWriteAccess, setFailedState, setSavedState])

  const replaceState = useCallback((nextState: LocalKitchenState, options?: { persist?: boolean }) => {
    setState(nextState)
    if (options?.persist !== false) {
      persistCache(nextState)
    }
  }, [])

  const buildContextState = useCallback(async () => {
    if (!auth.user || !auth.profile) {
      return
    }

    const weekStart = getWeekStartDate()
    const context = { user: auth.user, profile: auth.profile }
    const [dishes, ingredients, staples, pantryItems, weeklyPlan] = await Promise.all([
      getDishes(context),
      getIngredients(context),
      getStaples(context),
      getPantryItems(context),
      getWeeklyPlan(context, weekStart),
    ])

    const nextRepo = dishes.map(mapCloudDishToDomain)
    const nextStaples = staples.map((item) => item.name)
    const nextIngredients = ingredients.map(mapCloudIngredientToDomain)
    const nextPlan = buildWeeklyPlanFromSlots(
      weekStart,
      weeklyPlan.mealSlots,
    )

    const nextState: LocalKitchenState = {
      ...state,
      repo: nextRepo,
      ingredients: syncIngredientsFromRepo(nextRepo, nextIngredients, nextStaples).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      staples: nextStaples,
      pantry: derivePantryItems(nextIngredients, nextStaples, pantryItems),
      plan: nextPlan,
      integrations: state.integrations,
      settings: { ...state.settings, integrations: state.integrations },
    }

    replaceState(nextState)
    setError(null)
  }, [auth.profile, auth.user, replaceState, state])

  const refreshData = useCallback(async () => {
    if (mockAuthEnabled || !isCloudConfigured() || !auth.user || !auth.profile) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      await buildContextState()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load kitchen data.')
    } finally {
      setLoading(false)
    }
  }, [auth.profile, auth.user, buildContextState, mockAuthEnabled])

  useEffect(() => {
    if (auth.loading || auth.profileState === 'loading') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void refreshData()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [auth.loading, auth.profileState, refreshData])

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }

    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (mockAuthEnabled || !supabase || !auth.user || !auth.profile?.householdId) {
      return
    }

    const client = supabase
    const householdId = auth.profile.householdId
    const userId = auth.user.id
    const channel = client.channel(`household-cache-${householdId}`)
    const handleRemoteChange = (payload: RealtimePayload) => {
      const row = payload.new ?? payload.old
      if (!row || row.household_id !== householdId || row.updated_by === userId) return
      void refreshData()
    }

    ;[
      'dishes',
      'ingredients',
      'staples',
      'pantry_items',
      'weekly_plans',
      'meal_slots',
      'household_settings',
    ].forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` },
        (payload) => handleRemoteChange(payload as RealtimePayload),
      )
    })

    channel.subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [auth.profile?.householdId, auth.user, mockAuthEnabled, refreshData])

  useEffect(() => () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const savePlan = useCallback(async (nextPlan: WeeklyPlan) => {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    await runWrite('Saved meal plan.', async () => {
      await saveWeeklyPlan({ user: auth.user, profile: auth.profile }, nextPlan)
      replaceState({ ...state, plan: nextPlan })
    })
  }, [auth.profile, auth.user, replaceState, runWrite, state])

  const ensureGeneratedIngredients = useCallback(async (repo: Dish[], ingredients: Ingredient[], staples: Staple[]) => {
    const syncedIngredients = syncIngredientsFromRepo(repo, ingredients, staples).sort((a, b) => a.name.localeCompare(b.name))
    const existing = new Set(ingredients.map((item) => item.name.toLowerCase()))
    const missing = syncedIngredients.filter((item) => !existing.has(item.name.toLowerCase()))

    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    for (const ingredient of missing) {
      await createIngredient(
        { user: auth.user, profile: auth.profile },
        {
          id: getIngredientId(ingredient.name),
          name: ingredient.name,
          emoji: ingredient.emoji,
          malayalamName: ingredient.malayalam,
          gujaratiName: ingredient.gujarati,
          imageUrl: ingredient.image,
        },
      )
    }

    return syncedIngredients
  }, [auth.profile, auth.user])

  async function saveDishAction(draft: DishDraft, imageFile?: File | null, removeLocalImage = false) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    const existing = draft.id ? state.repo.find((dish) => dish.id === draft.id) ?? null : null
    const nextDish = normalizeDishDraft(draft, existing)

    await runWrite('Saved dish.', async () => {
      if (existing) {
        await updateDish(
          { user: auth.user, profile: auth.profile },
          nextDish.id,
          {
            name: nextDish.name,
            category: nextDish.category,
            mainIngredients: nextDish.mainIngredients,
            emoji: nextDish.emoji,
            recipe: nextDish.recipe,
            youtubeUrl: nextDish.youtube,
            referenceText: nextDish.referenceText,
            imageUrl: nextDish.image,
          },
        )
      } else {
        await createDish(
          { user: auth.user, profile: auth.profile },
          {
            id: nextDish.id,
            name: nextDish.name,
            category: nextDish.category,
            mainIngredients: nextDish.mainIngredients,
            emoji: nextDish.emoji,
            recipe: nextDish.recipe,
            youtubeUrl: nextDish.youtube,
            referenceText: nextDish.referenceText,
            imageUrl: nextDish.image,
          },
        )
      }

      if (imageFile) {
        const blob = await compressImage(imageFile)
        await saveDishImage(nextDish.id, blob)
      } else if (removeLocalImage) {
        await deleteDishImage(nextDish.id)
      }

      const nextRepo = existing
        ? state.repo.map((dish) => (dish.id === nextDish.id ? nextDish : dish))
        : [...state.repo, nextDish]
      const nextIngredients = await ensureGeneratedIngredients(nextRepo, state.ingredients, state.staples)
      replaceState({
        ...state,
        repo: nextRepo,
        ingredients: nextIngredients,
        pantry: derivePantryItems(nextIngredients, state.staples, []),
      })
    })
  }

  async function deleteDishAction(id: string) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    await runWrite('Deleted dish.', async () => {
      await deleteDishDocument({ user: auth.user, profile: auth.profile }, id)
      await deleteDishImage(id)
      const nextRepo = state.repo.filter((dish) => dish.id !== id)
      replaceState({ ...state, repo: nextRepo })
    })
  }

  async function saveIngredientAction(draft: IngredientDraft, imageFile?: File | null, removeLocalImage = false) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    const nextIngredient = normalizeIngredientDraft(draft)
    const previousName = draft.previousName?.trim()
    const ingredientId = getIngredientId(previousName || nextIngredient.name)

    await runWrite('Saved ingredient.', async () => {
      if (previousName) {
        await updateIngredient(
          { user: auth.user, profile: auth.profile },
          ingredientId,
          {
            name: nextIngredient.name,
            emoji: nextIngredient.emoji,
            malayalamName: nextIngredient.malayalam,
            gujaratiName: nextIngredient.gujarati,
            imageUrl: nextIngredient.image,
          },
        )
      } else {
        await createIngredient(
          { user: auth.user, profile: auth.profile },
          {
            id: ingredientId,
            name: nextIngredient.name,
            emoji: nextIngredient.emoji,
            malayalamName: nextIngredient.malayalam,
            gujaratiName: nextIngredient.gujarati,
            imageUrl: nextIngredient.image,
          },
        )
      }

      if (imageFile) {
        const blob = await compressImage(imageFile)
        await saveIngredientImage(nextIngredient.name, blob)
        if (previousName && previousName !== nextIngredient.name) {
          await deleteIngredientImage(previousName)
        }
      } else if (removeLocalImage) {
        await deleteIngredientImage(nextIngredient.name)
      } else if (previousName && previousName !== nextIngredient.name) {
        const existingBlob = await getIngredientImage(previousName)
        if (existingBlob) {
          await saveIngredientImage(nextIngredient.name, existingBlob)
        }
        await deleteIngredientImage(previousName)
      }

      const key = previousName?.toLowerCase() ?? nextIngredient.name.toLowerCase()
      const exists = state.ingredients.some((ingredient) => ingredient.name.toLowerCase() === key)
      const nextIngredients = exists
        ? state.ingredients.map((ingredient) =>
            ingredient.name.toLowerCase() === key ? nextIngredient : ingredient,
          )
        : [...state.ingredients, nextIngredient]

      nextIngredients.sort((a, b) => a.name.localeCompare(b.name))
      replaceState({
        ...state,
        ingredients: nextIngredients,
        pantry: derivePantryItems(nextIngredients, state.staples, []),
      })
    })
  }

  async function deleteIngredientAction(name: string) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    await runWrite('Deleted ingredient.', async () => {
      await deleteIngredientDocument({ user: auth.user, profile: auth.profile }, getIngredientId(name))
      await deleteIngredientImage(name)
      const nextIngredients = state.ingredients.filter((ingredient) => ingredient.name !== name)
      await deletePantryItem({ user: auth.user, profile: auth.profile }, getIngredientId(name))
      replaceState({
        ...state,
        ingredients: nextIngredients,
        pantry: state.pantry.filter((item) => item.id !== getIngredientId(name)),
      })
    })
  }

  async function addStapleAction(name: string) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')
    const normalized = name.trim().toLowerCase()
    if (!normalized || state.staples.includes(normalized)) return

    await runWrite('Saved staple.', async () => {
      await upsertStaple({ user: auth.user, profile: auth.profile }, normalized)
      const nextStaples = [...state.staples, normalized].sort((a, b) => a.localeCompare(b))
      replaceState({
        ...state,
        staples: nextStaples,
        pantry: derivePantryItems(state.ingredients, nextStaples, []),
      })
    })
  }

  async function removeStapleAction(name: string) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    await runWrite('Deleted staple.', async () => {
      await deleteStaple({ user: auth.user, profile: auth.profile }, name)
      await deletePantryItem({ user: auth.user, profile: auth.profile }, getStapleId(name))
      const nextStaples = state.staples.filter((staple) => staple !== name)
      replaceState({
        ...state,
        staples: nextStaples,
        pantry: state.pantry.filter((item) => item.id !== getStapleId(name)),
      })
    })
  }

  async function updatePantryItemAction(item: PantryItem) {
    if (!auth.user || !auth.profile) throw new Error('Connect to edit.')

    await runWrite('Saved pantry item.', async () => {
      await upsertPantryItem(
        { user: auth.user, profile: auth.profile },
        {
          ingredientId: item.id,
          kind: item.kind,
          name: item.name,
          quantity: item.quantity ?? '',
          unit: item.unit ?? '',
          status: item.status ?? 'unknown',
        },
      )

      const nextPantry = state.pantry.map((entry) => (entry.id === item.id ? item : entry))
      replaceState({ ...state, pantry: nextPantry })
    })
  }

  async function setPlanAction(nextPlan: WeeklyPlan) {
    await savePlan(nextPlan)
  }

  async function updateSlotValue(
    day: DayKey,
    meal: 'breakfast' | 'lunch' | 'dinner',
    field: string,
    value: string | string[],
  ) {
    const nextPlan = updateMealSlot(state.plan, day, meal, field, value)
    await setPlanAction(nextPlan)
  }

  async function clearSlotAction(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string) {
    const value = field === 'sabjis' ? [] : ''
    await updateSlotValue(day, meal, field, value)
  }

  async function copyDayAction(fromDay: DayKey, toDay: DayKey) {
    await setPlanAction(copyDayPlan(state.plan, fromDay, toDay))
  }

  async function clearDayAction(day: DayKey) {
    const nextPlan = structuredClone(state.plan)
    nextPlan.days[day] = {
      breakfast: { sabjis: [] },
      lunch: { curry: '', sabji: '', gujaratiSabji: '' },
      dinner: { curry: '', sabjis: [], gujaratiSabji: '' },
    }
    await setPlanAction(nextPlan)
  }

  function setIntegrations(integrations: Integrations) {
    requireWriteAccess()
    replaceState({
      ...state,
      integrations,
      settings: { ...state.settings, integrations },
    }, { persist: false })
    persistIntegrations(integrations)
  }

  async function importPayloadToCloud(
    repo: Dish[],
    ingredients: Ingredient[],
    staples: Staple[],
    plan?: WeeklyPlan | null,
  ) {
    if (!auth.user || !auth.profile) {
      throw new Error('Connect to edit.')
    }

    const existingDishIds = new Set(state.repo.map((dish) => dish.id))
    const existingIngredientIds = new Set(state.ingredients.map((ingredient) => getIngredientId(ingredient.name)))
    const existingStapleIds = new Set(state.staples.map((staple) => getStapleId(staple)))

    let dishAdd = 0
    let dishUpd = 0
    let ingAdd = 0
    let ingUpd = 0
    let stapleAdd = 0
    let stapleUpd = 0

    await runWrite('Imported data to cloud.', async () => {
      for (const dish of repo) {
        const exists = existingDishIds.has(dish.id)
        await (exists
          ? updateDish(
              { user: auth.user, profile: auth.profile },
              dish.id,
              {
                name: dish.name,
                category: dish.category,
                mainIngredients: dish.mainIngredients,
                emoji: dish.emoji,
                recipe: dish.recipe,
                youtubeUrl: dish.youtube,
                referenceText: dish.referenceText,
                imageUrl: dish.image,
              },
            )
          : createDish(
              { user: auth.user, profile: auth.profile },
              {
                id: dish.id,
                name: dish.name,
                category: dish.category,
                mainIngredients: dish.mainIngredients,
                emoji: dish.emoji,
                recipe: dish.recipe,
                youtubeUrl: dish.youtube,
                referenceText: dish.referenceText,
                imageUrl: dish.image,
              },
            ))
        if (exists) dishUpd += 1
        else dishAdd += 1
      }

      for (const ingredient of ingredients) {
        const ingredientId = getIngredientId(ingredient.name)
        const exists = existingIngredientIds.has(ingredientId)
        await (exists
          ? updateIngredient(
              { user: auth.user, profile: auth.profile },
              ingredientId,
              {
                name: ingredient.name,
                emoji: ingredient.emoji,
                malayalamName: ingredient.malayalam,
                gujaratiName: ingredient.gujarati,
                imageUrl: ingredient.image,
              },
            )
          : createIngredient(
              { user: auth.user, profile: auth.profile },
              {
                id: ingredientId,
                name: ingredient.name,
                emoji: ingredient.emoji,
                malayalamName: ingredient.malayalam,
                gujaratiName: ingredient.gujarati,
                imageUrl: ingredient.image,
              },
            ))
        await upsertPantryItem(
          { user: auth.user, profile: auth.profile },
          {
            ingredientId,
            kind: 'ingredient',
            name: ingredient.name,
            quantity: '',
            unit: '',
            status: 'unknown',
          },
        )
        if (exists) ingUpd += 1
        else ingAdd += 1
      }

      for (const staple of staples) {
        const stapleId = getStapleId(staple)
        const exists = existingStapleIds.has(stapleId)
        await upsertStaple({ user: auth.user, profile: auth.profile }, staple)
        await upsertPantryItem(
          { user: auth.user, profile: auth.profile },
          {
            ingredientId: stapleId,
            kind: 'staple',
            name: staple,
            quantity: '',
            unit: '',
            status: 'available',
          },
        )
        if (exists) stapleUpd += 1
        else stapleAdd += 1
      }

      if (plan) {
        await saveWeeklyPlan({ user: auth.user, profile: auth.profile }, plan)
      }

      await refreshData()
    })

    return { dishAdd, dishUpd, ingAdd, ingUpd, stapleAdd, stapleUpd }
  }

  async function importJson(text: string) {
    const payload = parseImportPayload(text)
    return importPayloadToCloud(payload.sabjis, payload.ingredients, payload.staples)
  }

  async function runFridgePlan(available: string[], includeGujarati: boolean) {
    const result = generatePlanFromFridge(state.repo, state.plan, available, state.staples, includeGujarati)
    await setPlanAction(result.plan)
    return {
      filledCount: result.filledCount,
      makeableCount: result.makeableCount,
    }
  }

  async function getMigrationPreview(): Promise<MigrationPreview> {
    const hasLegacyData = Boolean(
      readRawStorageValue('moms_sabji_repo')
      || readRawStorageValue('moms_ingredients')
      || readRawStorageValue('moms_staples')
      || readRawStorageValue('moms_weekly_plan'),
    )
    const legacyState = loadKitchenState()
    const [dishImages, ingredientImages] = await Promise.all([
      listDishImagesAsDataUrls(),
      listIngredientImagesAsDataUrls(),
    ])

    return {
      hasLegacyData,
      hasLocalImages: Object.keys(dishImages).length > 0 || Object.keys(ingredientImages).length > 0,
      dishes: hasLegacyData ? legacyState.repo : [],
      ingredients: hasLegacyData ? legacyState.ingredients : [],
      staples: hasLegacyData ? legacyState.staples : [],
      plan: hasLegacyData ? legacyState.plan : null,
    }
  }

  async function runLegacyMigration(): Promise<MigrationSummary> {
    const preview = await getMigrationPreview()
    if (!preview.hasLegacyData) {
      return {
        created: 0,
        updated: 0,
        skipped: 1,
        failed: 0,
        failures: ['No legacy localStorage data was found on this device.'],
      }
    }

    try {
      const stats = await importPayloadToCloud(
        preview.dishes,
        preview.ingredients,
        preview.staples,
        preview.plan,
      )

      return {
        created: stats.dishAdd + stats.ingAdd + stats.stapleAdd,
        updated: stats.dishUpd + stats.ingUpd + stats.stapleUpd,
        skipped: 0,
        failed: 0,
        failures: [],
      }
    } catch (caught) {
      return {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        failures: [caught instanceof Error ? caught.message : 'Migration failed.'],
      }
    }
  }

  const value: LocalKitchenContextValue = {
    state,
    exportJson: JSON.stringify(buildExportPayload(state), null, 2),
    loading,
    error,
    syncState,
    syncMessage,
    canEditData,
    canImportExport,
    refreshData,
    setPlan: setPlanAction,
    setIntegrations,
    saveDish: saveDishAction,
    deleteDish: deleteDishAction,
    saveIngredient: saveIngredientAction,
    deleteIngredient: deleteIngredientAction,
    addStaple: addStapleAction,
    removeStaple: removeStapleAction,
    updatePantryItem: updatePantryItemAction,
    updateSlot: updateSlotValue,
    clearSlot: clearSlotAction,
    copyDay: copyDayAction,
    clearDay: clearDayAction,
    importJson,
    runFridgePlan,
    suggestFromIngredients(available) {
      return suggestDishesFromIngredients(state.repo, available, state.staples)
    },
    getDishById(id) {
      return getDishById(state.repo, id)
    },
    getOverlappingDishes(dishId) {
      return getOverlappingDishes(state.repo, dishId, state.staples)
    },
    getIngredientsNeeded(scope) {
      return computeIngredientsNeeded(state.repo, state.plan, state.staples, scope)
    },
    getMigrationPreview,
    runLegacyMigration,
  }

  return <LocalKitchenContext.Provider value={value}>{children}</LocalKitchenContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalKitchen() {
  const context = useContext(LocalKitchenContext)
  if (!context) {
    throw new Error('useLocalKitchen must be used inside LocalKitchenProvider')
  }

  return context
}
