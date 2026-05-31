import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import type {
  DayKey,
  Dish,
  Ingredient,
  Integrations,
  LocalKitchenState,
  Staple,
  WeeklyPlan,
} from '../types/domain'
import {
  computeIngredientsNeeded,
  copyDayPlan,
  derivePantryItems,
  generatePlanFromFridge,
  getDishById,
  getOverlappingDishes,
  loadKitchenState,
  persistIngredients,
  persistIntegrations,
  persistPlan,
  persistRepo,
  persistStaples,
  suggestDishesFromIngredients,
  syncIngredientsFromRepo,
  updateMealSlot,
} from '../services/local/kitchen'
import {
  applyImportPayload,
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

type DishDraft = Omit<Dish, 'id'> & { id?: string }
type IngredientDraft = Ingredient & { previousName?: string }

type FridgePlanResult = {
  filledCount: number
  makeableCount: number
}

type LocalKitchenContextValue = {
  state: LocalKitchenState
  exportJson: string
  setPlan(nextPlan: WeeklyPlan): void
  setIntegrations(integrations: Integrations): void
  saveDish(draft: DishDraft, imageFile?: File | null, removeLocalImage?: boolean): Promise<void>
  deleteDish(id: string): Promise<void>
  saveIngredient(draft: IngredientDraft, imageFile?: File | null, removeLocalImage?: boolean): Promise<void>
  deleteIngredient(name: string): Promise<void>
  addStaple(name: string): void
  removeStaple(name: string): void
  updateSlot(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string, value: string | string[]): void
  clearSlot(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string): void
  copyDay(fromDay: DayKey, toDay: DayKey): void
  clearDay(day: DayKey): void
  importJson(text: string): { dishAdd: number; dishUpd: number; ingAdd: number; ingUpd: number }
  runFridgePlan(available: string[], includeGujarati: boolean): FridgePlanResult
  suggestFromIngredients(available: string[]): Dish[]
  getDishById(id: string): Dish | null
  getOverlappingDishes(dishId: string): ReturnType<typeof getOverlappingDishes>
  getIngredientsNeeded(scope: 'today' | 'tomorrow' | 'week' | DayKey): ReturnType<typeof computeIngredientsNeeded>
}

const LocalKitchenContext = createContext<LocalKitchenContextValue | null>(null)

function normalizeDishDraft(draft: DishDraft, existing?: Dish | null): Dish {
  return {
    id: draft.id ?? existing?.id ?? `${draft.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
    name: draft.name.trim(),
    category: draft.category,
    mainIngredients: draft.mainIngredients.map((item) => item.trim()).filter(Boolean),
    emoji: draft.emoji.trim() || existing?.emoji || '🥗',
    bgColor: draft.bgColor || existing?.bgColor || '#d4edda',
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

export function LocalKitchenProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<LocalKitchenState>(() => loadKitchenState())

  function replaceState(nextState: LocalKitchenState) {
    setState({
      ...nextState,
      pantry: derivePantryItems(nextState.ingredients, nextState.staples),
    })
  }

  function commitCollections(nextRepo: Dish[], nextIngredients: Ingredient[], nextStaples: Staple[]) {
    persistRepo(nextRepo)
    persistIngredients(nextIngredients)
    persistStaples(nextStaples)
    replaceState({
      ...state,
      repo: nextRepo,
      ingredients: nextIngredients,
      staples: nextStaples,
      pantry: derivePantryItems(nextIngredients, nextStaples),
    })
  }

  async function saveDish(draft: DishDraft, imageFile?: File | null, removeLocalImage = false) {
    const existing = draft.id ? state.repo.find((dish) => dish.id === draft.id) ?? null : null
    const nextDish = normalizeDishDraft(draft, existing)
    const nextRepo = existing
      ? state.repo.map((dish) => (dish.id === nextDish.id ? nextDish : dish))
      : [...state.repo, nextDish]
    const nextIngredients = syncIngredientsFromRepo(nextRepo, state.ingredients, state.staples).sort((a, b) =>
      a.name.localeCompare(b.name),
    )

    persistRepo(nextRepo)
    persistIngredients(nextIngredients)

    if (imageFile) {
      const blob = await compressImage(imageFile)
      await saveDishImage(nextDish.id, blob)
    } else if (removeLocalImage) {
      await deleteDishImage(nextDish.id)
    }

    replaceState({
      ...state,
      repo: nextRepo,
      ingredients: nextIngredients,
      pantry: derivePantryItems(nextIngredients, state.staples),
    })
  }

  async function deleteDish(id: string) {
    const nextRepo = state.repo.filter((dish) => dish.id !== id)
    persistRepo(nextRepo)
    await deleteDishImage(id)
    replaceState({ ...state, repo: nextRepo })
  }

  async function saveIngredient(draft: IngredientDraft, imageFile?: File | null, removeLocalImage = false) {
    const nextIngredient = normalizeIngredientDraft(draft)
    const previousName = draft.previousName?.trim()
    const existingName = previousName || draft.name
    const nextIngredients = state.ingredients.some(
      (ingredient) => ingredient.name.toLowerCase() === existingName.toLowerCase(),
    )
      ? state.ingredients.map((ingredient) =>
          ingredient.name.toLowerCase() === existingName.toLowerCase() ? nextIngredient : ingredient,
        )
      : [...state.ingredients, nextIngredient]

    nextIngredients.sort((a, b) => a.name.localeCompare(b.name))
    persistIngredients(nextIngredients)

    if (imageFile) {
      const blob = await compressImage(imageFile)
      await saveIngredientImage(nextIngredient.name, blob)
      if (previousName && previousName !== nextIngredient.name) {
        await deleteIngredientImage(previousName)
      }
    } else if (removeLocalImage) {
      await deleteIngredientImage(nextIngredient.name)
      if (previousName && previousName !== nextIngredient.name) {
        await deleteIngredientImage(previousName)
      }
    } else if (previousName && previousName !== nextIngredient.name) {
      const existingBlob = await getIngredientImage(previousName)
      if (existingBlob) {
        await saveIngredientImage(nextIngredient.name, existingBlob)
      }
      await deleteIngredientImage(previousName)
    }

    replaceState({
      ...state,
      ingredients: nextIngredients,
      pantry: derivePantryItems(nextIngredients, state.staples),
    })
  }

  async function deleteIngredient(name: string) {
    const nextIngredients = state.ingredients.filter((ingredient) => ingredient.name !== name)
    persistIngredients(nextIngredients)
    await deleteIngredientImage(name)
    replaceState({
      ...state,
      ingredients: nextIngredients,
      pantry: derivePantryItems(nextIngredients, state.staples),
    })
  }

  function addStaple(name: string) {
    const normalized = name.trim().toLowerCase()
    if (!normalized || state.staples.includes(normalized)) return
    const nextStaples = [...state.staples, normalized]
    const nextIngredients = state.ingredients.filter(
      (ingredient) => ingredient.name.toLowerCase() !== normalized,
    )
    commitCollections(nextRepoPreserve(), nextIngredients, nextStaples)
  }

  function removeStaple(name: string) {
    const normalized = name.trim().toLowerCase()
    const nextStaples = state.staples.filter((staple) => staple !== normalized)
    commitCollections(nextRepoPreserve(), state.ingredients, nextStaples)
  }

  function nextRepoPreserve() {
    return state.repo
  }

  function setPlan(nextPlan: WeeklyPlan) {
    persistPlan(nextPlan)
    replaceState({ ...state, plan: nextPlan })
  }

  function updateSlotValue(
    day: DayKey,
    meal: 'breakfast' | 'lunch' | 'dinner',
    field: string,
    value: string | string[],
  ) {
    const nextPlan = updateMealSlot(state.plan, day, meal, field, value)
    setPlan(nextPlan)
  }

  function clearSlot(day: DayKey, meal: 'breakfast' | 'lunch' | 'dinner', field: string) {
    const value = field === 'sabjis' ? [] : ''
    updateSlotValue(day, meal, field, value)
  }

  function copyDay(fromDay: DayKey, toDay: DayKey) {
    setPlan(copyDayPlan(state.plan, fromDay, toDay))
  }

  function clearDay(day: DayKey) {
    const nextPlan = structuredClone(state.plan)
    nextPlan.days[day] = {
      breakfast: { sabjis: [] },
      lunch: { curry: '', sabji: '', gujaratiSabji: '' },
      dinner: { curry: '', sabjis: [], gujaratiSabji: '' },
    }
    setPlan(nextPlan)
  }

  function setIntegrations(integrations: Integrations) {
    persistIntegrations(integrations)
    replaceState({
      ...state,
      integrations,
      settings: { ...state.settings, integrations },
    })
  }

  function importJson(text: string) {
    const payload = parseImportPayload(text)
    const { nextState, stats } = applyImportPayload(state, payload)
    persistRepo(nextState.repo)
    persistIngredients(nextState.ingredients)
    persistStaples(nextState.staples)
    replaceState(nextState)

    return stats
  }

  function runFridgePlan(available: string[], includeGujarati: boolean) {
    const result = generatePlanFromFridge(state.repo, state.plan, available, state.staples, includeGujarati)
    setPlan(result.plan)
    return {
      filledCount: result.filledCount,
      makeableCount: result.makeableCount,
    }
  }

  const value = useMemo<LocalKitchenContextValue>(
    () => ({
      state,
      exportJson: JSON.stringify(buildExportPayload(state), null, 2),
      setPlan,
      setIntegrations,
      saveDish,
      deleteDish,
      saveIngredient,
      deleteIngredient,
      addStaple,
      removeStaple,
      updateSlot: updateSlotValue,
      clearSlot,
      copyDay,
      clearDay,
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
    }),
    [state],
  )

  return <LocalKitchenContext.Provider value={value}>{children}</LocalKitchenContext.Provider>
}

export function useLocalKitchen() {
  const context = useContext(LocalKitchenContext)
  if (!context) {
    throw new Error('useLocalKitchen must be used inside LocalKitchenProvider')
  }

  return context
}
