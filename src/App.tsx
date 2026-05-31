import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { DAY_FULL, DAYS, getTodayKey, getTomorrowKey } from './lib/date/plans'
import { dataUrlToBlob } from './lib/image/base64'
import { useAuth } from './features/auth/use-auth'
import { hasFirebaseConfig } from './lib/firebase/client'
import { pushKitchenStateToFirestore } from './services/firestore/household'
import {
  applyImport,
  buildExportPayload,
  captureLegacySnapshot,
  computeIngredientsNeeded,
  generatePlanFromFridge,
  getDayPlan,
  getDishById,
  loadKitchenState,
  normalizeDishId,
  persistIngredients,
  persistPlan,
  persistRepo,
  persistStaples,
  suggestDishesFromIngredients,
  syncIngredientsFromRepo,
  updateMealSlot,
} from './services/local/kitchen'
import {
  compressImage,
  deleteDishImage,
  deleteIngredientImage,
  getDishImage,
  getIngredientImage,
  saveDishImage,
  saveIngredientImage,
} from './services/local/imageStore'
import type {
  DayKey,
  DayPlan,
  Dish,
  DishCategory,
  ExportPayload,
  Ingredient,
  LegacySnapshot,
  LocalKitchenState,
} from './types/domain'

type MainTab = 'today' | 'tomorrow' | 'week' | 'pantry'
type AdminSection = 'dishes' | 'ingredients' | 'data' | 'cloud'
type PickerContext = {
  day: DayKey
  meal: keyof DayPlan
  field: string
  index?: number
  filter?: DishCategory | 'all'
}
type DishDraft = Partial<Dish> & { id?: string }
type IngredientDraft = Partial<Ingredient> & { originalName?: string }

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function todayLabel(day: DayKey) {
  const today = getTodayKey()
  const tomorrow = getTomorrowKey()
  if (day === today) return `${DAY_FULL[day]} · Today`
  if (day === tomorrow) return `${DAY_FULL[day]} · Tomorrow`
  return DAY_FULL[day]
}

function ImageBadge({
  label,
  remoteUrl,
  loadLocal,
  background,
  emoji,
  className,
}: {
  label: string
  remoteUrl?: string
  loadLocal: () => Promise<Blob | null>
  background: string
  emoji: string
  className?: string
}) {
  const [localSrc, setLocalSrc] = useState<string | null>(null)
  const src = remoteUrl ?? localSrc

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    if (remoteUrl) return () => undefined

    void loadLocal().then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setLocalSrc(objectUrl)
    })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [remoteUrl, loadLocal])

  if (src) {
    return <img src={src} alt={label} className={classNames('h-full w-full object-cover', className)} />
  }

  return (
    <div
      className={classNames('flex h-full w-full items-center justify-center text-3xl', className)}
      style={{ background }}
      aria-label={label}
    >
      {emoji}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="mk-modal-backdrop">
      <div className="mk-modal-panel">
        <div className="border-b-2 border-green-accent bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            <button className="text-xl font-bold" onClick={onClose}>
              ✕
            </button>
            <h2 className="font-display text-lg font-extrabold">{title}</h2>
            <div className="w-5" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const [state, setState] = useState<LocalKitchenState>(() => loadKitchenState())
  const [tab, setTab] = useState<MainTab>('today')
  const [selectedDay, setSelectedDay] = useState<DayKey>(getTodayKey())
  const [adminSection, setAdminSection] = useState<AdminSection>('dishes')
  const [pickerContext, setPickerContext] = useState<PickerContext | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showFridge, setShowFridge] = useState(false)
  const [ingredientsScope, setIngredientsScope] = useState<'today' | 'tomorrow' | 'week' | DayKey | null>(null)
  const [dishDraft, setDishDraft] = useState<DishDraft | null>(null)
  const [ingredientDraft, setIngredientDraft] = useState<IngredientDraft | null>(null)
  const [dishUpload, setDishUpload] = useState<File | null>(null)
  const [ingredientUpload, setIngredientUpload] = useState<File | null>(null)
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([])
  const [importText, setImportText] = useState('')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [toast, setToast] = useState<string | null>(null)
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const repo = state.repo
  const plan = state.plan
  const ingredients = state.ingredients
  const staples = state.staples

  const visibleDay = tab === 'tomorrow' ? getTomorrowKey() : selectedDay
  const pickerSuggestions = useMemo(() => {
    if (!pickerContext) return []
    if (!availableIngredients.length) return repo
    return suggestDishesFromIngredients(repo, availableIngredients, staples)
  }, [pickerContext, availableIngredients, repo, staples])

  const ingredientCounts = useMemo(() => {
    if (!ingredientsScope) return null
    return computeIngredientsNeeded(repo, state.plan, staples, ingredientsScope)
  }, [ingredientsScope, repo, staples, state])

  function updateState(next: LocalKitchenState) {
    setState(next)
    persistRepo(next.repo)
    persistIngredients(next.ingredients)
    persistStaples(next.staples)
    persistPlan(next.plan)
  }

  function savePlan(nextPlan: LocalKitchenState['plan']) {
    setState({ ...state, plan: nextPlan })
    persistPlan(nextPlan)
  }

  function handlePickDish(dishId: string) {
    if (!pickerContext || !plan) return
    const nextPlan =
      pickerContext.field === 'sabjis'
        ? updateMealSlot(
            plan,
            pickerContext.day,
            pickerContext.meal,
            pickerContext.field,
            (() => {
              const current = [...((getDayPlan(plan, pickerContext.day)[pickerContext.meal] as { sabjis: string[] }).sabjis ?? [])]
              current[pickerContext.index ?? 0] = dishId
              return current
            })(),
          )
        : updateMealSlot(plan, pickerContext.day, pickerContext.meal, pickerContext.field, dishId)

    savePlan(nextPlan)
    setPickerContext(null)
    setAvailableIngredients([])
    setToast('Dish added to plan.')
  }

  async function persistDishDraft() {
    if (!dishDraft?.name || !dishDraft.category) return
    const ingredientsFromText = (dishDraft.mainIngredients ?? []).map((item) => item.trim()).filter(Boolean)
    const existing = dishDraft.id ? repo.find((dish) => dish.id === dishDraft.id) : null
    const id = existing?.id ?? normalizeDishId(dishDraft.name)
    const nextDish: Dish = {
      id,
      name: dishDraft.name,
      category: dishDraft.category,
      emoji: dishDraft.emoji || existing?.emoji || '🥗',
      bgColor:
        dishDraft.bgColor ||
        existing?.bgColor ||
        (dishDraft.category === 'curry' ? '#fff3cd' : dishDraft.category === 'gujarati' ? '#e2d9f3' : '#d4edda'),
      mainIngredients: ingredientsFromText,
      referenceText: dishDraft.referenceText || '',
      recipe: dishDraft.recipe || '',
      youtube: dishDraft.youtube || '',
      image: dishDraft.image || '',
    }

    const nextRepo = existing ? repo.map((dish) => (dish.id === id ? nextDish : dish)) : [...repo, nextDish]

    if (dishUpload) {
      const blob = await compressImage(dishUpload)
      await saveDishImage(id, blob)
      nextDish.image = ''
    } else if (nextDish.image) {
      await deleteDishImage(id)
    }

    const nextIngredients = syncIngredientsFromRepo(nextRepo, ingredients, staples)
    updateState({ ...state, repo: nextRepo, ingredients: nextIngredients })
    setDishDraft(null)
    setDishUpload(null)
    setToast(existing ? 'Dish updated.' : 'Dish added.')
  }

  async function persistIngredientDraft() {
    if (!ingredientDraft?.name) return
    const existingName = ingredientDraft.originalName
    const nextIngredient: Ingredient = {
      name: ingredientDraft.name,
      emoji: ingredientDraft.emoji || '🥗',
      malayalam: ingredientDraft.malayalam || '',
      gujarati: ingredientDraft.gujarati || '',
      image: ingredientDraft.image || '',
    }

    const filtered = ingredients.filter((ingredient) => ingredient.name !== existingName)
    const nextIngredients = [...filtered, nextIngredient].sort((a, b) => a.name.localeCompare(b.name))

    if (ingredientUpload) {
      const blob = await compressImage(ingredientUpload)
      await saveIngredientImage(nextIngredient.name, blob)
      nextIngredient.image = ''
      if (existingName && existingName !== nextIngredient.name) await deleteIngredientImage(existingName)
    } else if (nextIngredient.image) {
      await deleteIngredientImage(nextIngredient.name)
    }

    updateState({ ...state, ingredients: nextIngredients })
    setIngredientDraft(null)
    setIngredientUpload(null)
    setToast('Ingredient saved.')
  }

  async function exportFullBackup() {
    const snapshot = await captureLegacySnapshot(state)
    downloadJson(`moms-kitchen-backup-${snapshot.exportedAt.slice(0, 10)}.json`, snapshot)
    setToast('Migration backup downloaded.')
  }

  function exportCookbook() {
    downloadJson('moms-kitchen-cookbook.json', buildExportPayload(state))
    setToast('Cookbook export downloaded.')
  }

  async function importPayloadFromText(text: string) {
    const parsed = JSON.parse(text) as ExportPayload | LegacySnapshot
    const payload =
      'version' in parsed
        ? parsed
        : {
            version: 1 as const,
            sabjis: parsed.repo,
            ingredients: parsed.ingredients,
            staples: parsed.staples,
          }

    const nextState = applyImport(state, payload)
    updateState(nextState)

    if (!('version' in parsed) && parsed.images) {
      await Promise.all(
        Object.entries(parsed.images.dishes).map(([id, dataUrl]) =>
          saveDishImage(id, dataUrlToBlob(String(dataUrl))),
        ),
      )
      await Promise.all(
        Object.entries(parsed.images.ingredients).map(([name, dataUrl]) =>
          saveIngredientImage(name, dataUrlToBlob(String(dataUrl))),
        ),
      )
    }

    setImportText('')
    setToast('Import complete.')
  }

  async function handleCloudPush() {
    if (!auth.user || !auth.profile) return
    try {
      await pushKitchenStateToFirestore(auth.user, auth.profile, state)
      setCloudMessage('Local data pushed to Firestore.')
    } catch (caught) {
      setCloudMessage(caught instanceof Error ? caught.message : 'Cloud sync failed.')
    }
  }

  const currentDayPlan = getDayPlan(plan, visibleDay)
  const filteredPickerDishes = pickerContext
    ? pickerSuggestions.filter((dish) => !pickerContext.filter || pickerContext.filter === 'all' || dish.category === pickerContext.filter)
    : []

  return (
    <div className="mk-shell relative pb-28">
      <header className="sticky top-0 z-10 border-b-2 border-green-accent bg-cream px-4 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black">Mom&apos;s Kitchen</h1>
            <p className="text-sm text-muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button className="mk-button mk-button-secondary px-4 py-2 text-xs" onClick={() => setShowAdmin(true)}>
              Manage
            </button>
            <button
              className="mk-button mk-button-secondary px-4 py-2 text-xs"
              onClick={() => {
                setAdminSection('cloud')
                setShowAdmin(true)
              }}
            >
              {auth.user ? 'Cloud' : 'Login'}
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {(tab === 'today' || tab === 'tomorrow') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{todayLabel(visibleDay)}</p>
              <button
                className="mk-button mk-button-secondary px-3 py-2 text-xs"
                onClick={() => setIngredientsScope(tab === 'today' ? 'today' : 'tomorrow')}
              >
                Ingredients
              </button>
            </div>

            <MealCard
              title="Breakfast"
              body={currentDayPlan.breakfast.sabjis.map((dishId, index) => (
                <DishPill
                  key={`${dishId}-${index}`}
                  dish={getDishById(repo, dishId)}
                  onChange={() => setPickerContext({ day: visibleDay, meal: 'breakfast', field: 'sabjis', index, filter: 'sabji' })}
                  onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'breakfast', 'sabjis', currentDayPlan.breakfast.sabjis.filter((_, itemIndex) => itemIndex !== index)))}
                />
              ))}
              emptyLabel="Add breakfast sabji"
              onAdd={() =>
                setPickerContext({
                  day: visibleDay,
                  meal: 'breakfast',
                  field: 'sabjis',
                  index: currentDayPlan.breakfast.sabjis.length,
                  filter: 'sabji',
                })
              }
            />

            <MealCard
              title="Lunch"
              body={
                <>
                  <DishSlot
                    label="Curry"
                    dish={getDishById(repo, currentDayPlan.lunch.curry)}
                    onSelect={() => setPickerContext({ day: visibleDay, meal: 'lunch', field: 'curry', filter: 'curry' })}
                    onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'lunch', 'curry', ''))}
                  />
                  <DishSlot
                    label="Sabji"
                    dish={getDishById(repo, currentDayPlan.lunch.sabji)}
                    onSelect={() => setPickerContext({ day: visibleDay, meal: 'lunch', field: 'sabji', filter: 'sabji' })}
                    onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'lunch', 'sabji', ''))}
                  />
                  <DishSlot
                    label="Gujarati"
                    dish={getDishById(repo, currentDayPlan.lunch.gujaratiSabji)}
                    onSelect={() =>
                      setPickerContext({
                        day: visibleDay,
                        meal: 'lunch',
                        field: 'gujaratiSabji',
                        filter: 'gujarati',
                      })
                    }
                    onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'lunch', 'gujaratiSabji', ''))}
                  />
                </>
              }
            />

            <MealCard
              title="Dinner"
              body={
                <>
                  <DishSlot
                    label="Curry"
                    dish={getDishById(repo, currentDayPlan.dinner.curry)}
                    onSelect={() => setPickerContext({ day: visibleDay, meal: 'dinner', field: 'curry', filter: 'curry' })}
                    onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'dinner', 'curry', ''))}
                  />
                  {currentDayPlan.dinner.sabjis.map((dishId, index) => (
                    <DishPill
                      key={`${dishId}-${index}`}
                      dish={getDishById(repo, dishId)}
                      onChange={() => setPickerContext({ day: visibleDay, meal: 'dinner', field: 'sabjis', index, filter: 'sabji' })}
                      onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'dinner', 'sabjis', currentDayPlan.dinner.sabjis.filter((_, itemIndex) => itemIndex !== index)))}
                    />
                  ))}
                  <button className="mk-button mk-button-secondary w-full px-4 py-3 text-sm" onClick={() => setPickerContext({ day: visibleDay, meal: 'dinner', field: 'sabjis', index: currentDayPlan.dinner.sabjis.length, filter: 'sabji' })}>
                    + Add dinner sabji
                  </button>
                  <DishSlot
                    label="Gujarati"
                    dish={getDishById(repo, currentDayPlan.dinner.gujaratiSabji)}
                    onSelect={() => setPickerContext({ day: visibleDay, meal: 'dinner', field: 'gujaratiSabji', filter: 'gujarati' })}
                    onClear={() => savePlan(updateMealSlot(plan, visibleDay, 'dinner', 'gujaratiSabji', ''))}
                  />
                </>
              }
            />
          </div>
        )}

        {tab === 'week' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">This week</p>
              <div className="flex gap-2">
                {state.lastWeekPlan && (
                  <button
                    className="mk-button mk-button-secondary px-3 py-2 text-xs"
                    onClick={() => {
                      if (!state.lastWeekPlan) return
                      savePlan({ ...plan, days: structuredClone(state.lastWeekPlan.days) })
                      setToast('Last week loaded.')
                    }}
                  >
                    Use last week
                  </button>
                )}
                <button className="mk-button mk-button-secondary px-3 py-2 text-xs" onClick={() => setIngredientsScope('week')}>
                  Ingredients
                </button>
              </div>
            </div>
            {DAYS.map((day) => {
              const dayPlan = getDayPlan(plan, day)
              const lunch = [dayPlan.lunch.curry, dayPlan.lunch.sabji, dayPlan.lunch.gujaratiSabji].filter(Boolean)
              const dinner = [dayPlan.dinner.curry, ...dayPlan.dinner.sabjis, dayPlan.dinner.gujaratiSabji].filter(Boolean)
              return (
                <button
                  key={day}
                  className="mk-card w-full p-4 text-left"
                  onClick={() => {
                    setSelectedDay(day)
                    setTab('today')
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold">{todayLabel(day)}</span>
                    <span className="text-xs font-semibold text-muted">Open</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>🌅 {dayPlan.breakfast.sabjis.map((id) => getDishById(repo, id)?.name ?? '—').join(', ') || '—'}</div>
                    <div>☀️ {lunch.map((id) => getDishById(repo, id)?.name ?? '—').join(', ') || '—'}</div>
                    <div>🌙 {dinner.map((id) => getDishById(repo, id)?.name ?? '—').join(', ') || '—'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {tab === 'pantry' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Pantry</p>
              <div className="flex gap-2">
                <button className="mk-button mk-button-primary px-3 py-2 text-xs" onClick={() => setShowFridge(true)}>
                  Fridge mode
                </button>
                <button className="mk-button mk-button-secondary px-3 py-2 text-xs" onClick={() => setIngredientDraft({ name: '', emoji: '🥗', malayalam: '', gujarati: '' })}>
                  Add
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ingredients.map((ingredient) => (
                <button key={ingredient.name} className="mk-card p-3 text-left" onClick={() => setIngredientDraft({ ...ingredient, originalName: ingredient.name })}>
                  <div className="mb-3 h-20 overflow-hidden rounded-xl bg-green-soft">
                    <ImageBadge
                      label={ingredient.name}
                      remoteUrl={ingredient.image}
                      loadLocal={() => getIngredientImage(ingredient.name)}
                      background="#e8edcb"
                      emoji={ingredient.emoji || '🥗'}
                    />
                  </div>
                  <p className="font-semibold capitalize">{ingredient.name}</p>
                  <p className="text-xs text-muted">{[ingredient.malayalam, ingredient.gujarati].filter(Boolean).join(' · ') || 'Tap to edit'}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[430px] -translate-x-1/2 border-t-2 border-green-accent bg-cream px-2 py-3">
        {([
          ['today', 'Today'],
          ['tomorrow', 'Tomorrow'],
          ['week', 'Week'],
          ['pantry', 'Pantry'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            className={classNames(
              'flex-1 rounded-full px-3 py-3 text-sm font-semibold',
              tab === value ? 'bg-cta-yellow text-green-accent' : 'text-muted',
            )}
            onClick={() => {
              setTab(value)
              if (value === 'today') setSelectedDay(getTodayKey())
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 rounded-2xl border-2 border-green-accent bg-green-accent px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {pickerContext && (
        <Modal title="Pick a Dish" onClose={() => setPickerContext(null)}>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {(['all', 'sabji', 'curry', 'gujarati'] as const).map((filter) => (
              <button key={filter} className="mk-button mk-button-secondary px-4 py-2 text-sm" onClick={() => setPickerContext({ ...pickerContext, filter })}>
                {filter}
              </button>
            ))}
            <button className="mk-button mk-button-primary px-4 py-2 text-sm" onClick={() => setShowChecklist(true)}>
              By ingredients
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredPickerDishes.map((dish) => (
              <button key={dish.id} className="mk-card p-3 text-left" onClick={() => handlePickDish(dish.id)}>
                <div className="mb-3 h-24 overflow-hidden rounded-xl">
                  <ImageBadge
                    label={dish.name}
                    remoteUrl={dish.image}
                    loadLocal={() => getDishImage(dish.id)}
                    background={dish.bgColor}
                    emoji={dish.emoji || '🥗'}
                  />
                </div>
                <p className="font-semibold">{dish.name}</p>
                <p className="text-xs capitalize text-muted">{dish.category}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {showChecklist && (
        <Modal title="Filter By Ingredients" onClose={() => setShowChecklist(false)}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {ingredients.map((ingredient) => (
              <label key={ingredient.name} className="mk-card flex items-center gap-2 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={availableIngredients.includes(ingredient.name)}
                  onChange={(event) => {
                    setAvailableIngredients((current) =>
                      event.target.checked ? [...current, ingredient.name] : current.filter((item) => item !== ingredient.name),
                    )
                  }}
                />
                <span className="capitalize">{ingredient.name}</span>
              </label>
            ))}
          </div>
          <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => setShowChecklist(false)}>
            Apply filter
          </button>
        </Modal>
      )}

      {showFridge && (
        <Modal title="Plan From Fridge" onClose={() => setShowFridge(false)}>
          <div className="grid grid-cols-2 gap-2">
            {ingredients.map((ingredient) => (
              <label key={ingredient.name} className="mk-card flex items-center gap-2 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={availableIngredients.includes(ingredient.name)}
                  onChange={(event) => {
                    setAvailableIngredients((current) =>
                      event.target.checked ? [...current, ingredient.name] : current.filter((item) => item !== ingredient.name),
                    )
                  }}
                />
                <span className="capitalize">{ingredient.name}</span>
              </label>
            ))}
          </div>
          <button
            className="mk-button mk-button-primary mt-4 w-full px-4 py-3"
            onClick={() => {
              const result = generatePlanFromFridge(repo, plan, availableIngredients, staples, true)
              savePlan(result.plan)
              setShowFridge(false)
              setToast(
                result.makeableCount === 0
                  ? 'Nothing makeable with those ingredients.'
                  : result.filledCount === 0
                    ? 'All slots already filled.'
                    : `Added ${result.filledCount} dishes to today and tomorrow.`,
              )
            }}
          >
            Generate today + tomorrow
          </button>
        </Modal>
      )}

      {ingredientsScope && ingredientCounts && (
        <Modal title="Ingredients Needed" onClose={() => setIngredientsScope(null)}>
          {(['breakfast', 'lunch', 'dinner', 'total'] as const).map((section) => (
            <div key={section} className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">{section}</p>
              <div className="space-y-2">
                {Object.entries(ingredientCounts[section]).length === 0 && (
                  <p className="text-sm text-muted">Nothing needed.</p>
                )}
                {Object.entries(ingredientCounts[section]).map(([name, count]) => (
                  <div key={name} className="mk-card flex items-center justify-between px-4 py-3 text-sm">
                    <span className="capitalize">{name}</span>
                    <span className="font-semibold">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {showAdmin && (
        <Modal title="Manage Mom's Kitchen" onClose={() => setShowAdmin(false)}>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {(['dishes', 'ingredients', 'data', 'cloud'] as const).map((section) => (
              <button
                key={section}
                className={classNames(
                  'mk-button px-4 py-2 text-sm',
                  adminSection === section ? 'mk-button-primary' : 'mk-button-secondary',
                )}
                onClick={() => setAdminSection(section)}
              >
                {section}
              </button>
            ))}
          </div>

          {adminSection === 'dishes' && (
            <div className="space-y-4">
              <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => setDishDraft({ name: '', category: 'sabji', mainIngredients: [], emoji: '🥗' })}>
                + Add dish
              </button>
              {(['sabji', 'curry', 'gujarati'] as DishCategory[]).map((category) => (
                <div key={category}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">{category}</p>
                  <div className="space-y-2">
                    {repo
                      .filter((dish) => dish.category === category)
                      .map((dish) => (
                        <div key={dish.id} className="mk-card flex items-center gap-3 p-3">
                          <div className="h-16 w-16 overflow-hidden rounded-xl">
                            <ImageBadge
                              label={dish.name}
                              remoteUrl={dish.image}
                              loadLocal={() => getDishImage(dish.id)}
                              background={dish.bgColor}
                              emoji={dish.emoji || '🥗'}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{dish.name}</p>
                            <p className="truncate text-xs text-muted">{dish.mainIngredients.join(', ')}</p>
                          </div>
                          <button className="text-sm font-semibold" onClick={() => setDishDraft({ ...dish })}>
                            Edit
                          </button>
                          <button
                            className="text-sm font-semibold text-red-700"
                            onClick={async () => {
                              updateState({ ...state, repo: repo.filter((item) => item.id !== dish.id) })
                              await deleteDishImage(dish.id)
                              setToast('Dish deleted.')
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {adminSection === 'ingredients' && (
            <div className="space-y-4">
              <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => setIngredientDraft({ name: '', emoji: '🥗' })}>
                + Add ingredient
              </button>
              <div className="grid grid-cols-2 gap-3">
                {ingredients.map((ingredient) => (
                  <button key={ingredient.name} className="mk-card p-3 text-left" onClick={() => setIngredientDraft({ ...ingredient, originalName: ingredient.name })}>
                    <p className="font-semibold capitalize">{ingredient.name}</p>
                    <p className="text-xs text-muted">{ingredient.emoji}</p>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">Staples</p>
                <div className="flex flex-wrap gap-2">
                  {staples.map((staple) => (
                    <button
                      key={staple}
                      className="mk-button mk-button-secondary px-3 py-2 text-xs"
                      onClick={() => {
                        updateState({ ...state, staples: staples.filter((item) => item !== staple) })
                      }}
                    >
                      {staple} ✕
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminSection === 'data' && (
            <div className="space-y-4">
              <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={exportCookbook}>
                Download cookbook JSON
              </button>
              <button className="mk-button mk-button-secondary w-full px-4 py-3" onClick={() => void exportFullBackup()}>
                Download full migration backup
              </button>
              <textarea
                className="mk-textarea min-h-40"
                placeholder="Paste cookbook JSON or full migration backup here"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
              />
              <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => void importPayloadFromText(importText)}>
                Import JSON
              </button>
              <div className="mk-card p-4 text-sm text-muted">
                Legacy browser integrations were intentionally not reactivated in the hosted app. Local image support remains available and backup exports now include IndexedDB images.
              </div>
            </div>
          )}

          {adminSection === 'cloud' && (
            <div className="space-y-4">
              <div className="mk-card p-4 text-sm">
                <p className="font-semibold">Firebase status</p>
                <p className="mt-1 text-muted">{hasFirebaseConfig() ? 'Configured via Vite env vars.' : 'Not configured yet. Fill .env values before enabling auth/cloud sync.'}</p>
              </div>

              {auth.enabled ? (
                <>
                  {!auth.user && (
                    <div className="space-y-3">
                      <input className="mk-input" placeholder="Email" value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} />
                      <input className="mk-input" type="password" placeholder="Password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} />
                      <div className="flex gap-2">
                        <button className="mk-button mk-button-primary flex-1 px-4 py-3" onClick={() => void auth.signIn(authForm.email, authForm.password)}>
                          Sign in
                        </button>
                        <button className="mk-button mk-button-secondary flex-1 px-4 py-3" onClick={() => void auth.signUp(authForm.email, authForm.password)}>
                          Sign up
                        </button>
                      </div>
                    </div>
                  )}

                  {auth.user && (
                    <div className="space-y-3">
                      <div className="mk-card p-4 text-sm">
                        <p className="font-semibold">{auth.user.email}</p>
                        <p className="mt-1 text-muted">
                          Role: {auth.profile?.role ?? 'unknown'} · Household: {auth.profile?.householdId ?? 'not assigned'}
                        </p>
                      </div>
                      <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => void handleCloudPush()}>
                        Push local data to Firestore
                      </button>
                      <button className="mk-button mk-button-secondary w-full px-4 py-3" onClick={() => void auth.refreshProfile()}>
                        Refresh profile
                      </button>
                      <button className="mk-button mk-button-secondary w-full px-4 py-3" onClick={() => void auth.signOutUser()}>
                        Sign out
                      </button>
                      <div className="mk-card p-4 text-sm text-muted">
                        First admin bootstrap is intentionally manual for security. Create the user doc and assign `role: "admin"` plus a `householdId` in Firestore before running the first sync.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mk-card p-4 text-sm text-muted">Firebase isn&apos;t configured yet, so the app is running in local-first mode only.</div>
              )}

              {(auth.error || cloudMessage) && (
                <div className="mk-card p-4 text-sm text-muted">{auth.error || cloudMessage}</div>
              )}
            </div>
          )}
        </Modal>
      )}

      {dishDraft && (
        <Modal title={dishDraft.id ? 'Edit Dish' : 'Add Dish'} onClose={() => setDishDraft(null)}>
          <div className="space-y-3">
            <input className="mk-input" placeholder="Dish name" value={dishDraft.name ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, name: event.target.value }))} />
            <select className="mk-select" value={dishDraft.category ?? 'sabji'} onChange={(event) => setDishDraft((current) => ({ ...current, category: event.target.value as DishCategory }))}>
              <option value="sabji">Sabji</option>
              <option value="curry">Curry</option>
              <option value="gujarati">Gujarati</option>
            </select>
            <input className="mk-input" placeholder="Emoji" value={dishDraft.emoji ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, emoji: event.target.value }))} />
            <input
              className="mk-input"
              placeholder="Ingredients, comma separated"
              value={(dishDraft.mainIngredients ?? []).join(', ')}
              onChange={(event) =>
                setDishDraft((current) => ({
                  ...current,
                  mainIngredients: event.target.value.split(',').map((item) => item.trim()),
                }))
              }
            />
            <input className="mk-input" placeholder="Image URL (optional)" value={dishDraft.image ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, image: event.target.value }))} />
            <input className="mk-input" type="file" accept="image/*" onChange={(event) => setDishUpload(event.target.files?.[0] ?? null)} />
            <input className="mk-input" placeholder="Reference note" value={dishDraft.referenceText ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, referenceText: event.target.value }))} />
            <input className="mk-input" placeholder="YouTube URL" value={dishDraft.youtube ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, youtube: event.target.value }))} />
            <textarea className="mk-textarea min-h-32" placeholder="Recipe notes" value={dishDraft.recipe ?? ''} onChange={(event) => setDishDraft((current) => ({ ...current, recipe: event.target.value }))} />
            <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => void persistDishDraft()}>
              Save dish
            </button>
          </div>
        </Modal>
      )}

      {ingredientDraft && (
        <Modal title={ingredientDraft.originalName ? 'Edit Ingredient' : 'Add Ingredient'} onClose={() => setIngredientDraft(null)}>
          <div className="space-y-3">
            <input className="mk-input" placeholder="Ingredient name" value={ingredientDraft.name ?? ''} onChange={(event) => setIngredientDraft((current) => ({ ...current, name: event.target.value }))} />
            <input className="mk-input" placeholder="Emoji" value={ingredientDraft.emoji ?? ''} onChange={(event) => setIngredientDraft((current) => ({ ...current, emoji: event.target.value }))} />
            <input className="mk-input" placeholder="Malayalam transliteration" value={ingredientDraft.malayalam ?? ''} onChange={(event) => setIngredientDraft((current) => ({ ...current, malayalam: event.target.value }))} />
            <input className="mk-input" placeholder="Gujarati transliteration" value={ingredientDraft.gujarati ?? ''} onChange={(event) => setIngredientDraft((current) => ({ ...current, gujarati: event.target.value }))} />
            <input className="mk-input" placeholder="Image URL (optional)" value={ingredientDraft.image ?? ''} onChange={(event) => setIngredientDraft((current) => ({ ...current, image: event.target.value }))} />
            <input className="mk-input" type="file" accept="image/*" onChange={(event) => setIngredientUpload(event.target.files?.[0] ?? null)} />
            <button className="mk-button mk-button-primary w-full px-4 py-3" onClick={() => void persistIngredientDraft()}>
              Save ingredient
            </button>
            {ingredientDraft.originalName && (
              <button
                className="mk-button mk-button-danger w-full px-4 py-3"
                onClick={async () => {
                  const originalName = ingredientDraft.originalName
                  if (!originalName) return
                  updateState({ ...state, ingredients: ingredients.filter((item) => item.name !== originalName) })
                  await deleteIngredientImage(originalName)
                  setIngredientDraft(null)
                  setToast('Ingredient deleted.')
                }}
              >
                Delete ingredient
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function MealCard({
  title,
  body,
  emptyLabel,
  onAdd,
}: {
  title: string
  body: ReactNode
  emptyLabel?: string
  onAdd?: () => void
}) {
  return (
    <section className="mk-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        {onAdd && (
          <button className="mk-button mk-button-secondary px-3 py-2 text-xs" onClick={onAdd}>
            {emptyLabel ?? 'Add'}
          </button>
        )}
      </div>
      <div className="space-y-3">{body}</div>
    </section>
  )
}

function DishSlot({
  label,
  dish,
  onSelect,
  onClear,
}: {
  label: string
  dish: Dish | null
  onSelect: () => void
  onClear: () => void
}) {
  return (
    <div className="mk-card flex items-center justify-between gap-3 border-dashed px-4 py-3">
      <button className="flex-1 text-left" onClick={onSelect}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="mt-1 font-semibold">{dish?.name ?? `Add ${label.toLowerCase()}`}</p>
      </button>
      {dish && (
        <button className="text-sm font-semibold text-red-700" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  )
}

function DishPill({
  dish,
  onChange,
  onClear,
}: {
  dish: Dish | null
  onChange: () => void
  onClear: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-full border-2 border-green-accent bg-white px-4 py-3 shadow-[3px_3px_0_#1a4731]">
      <button className="flex-1 text-left font-semibold" onClick={onChange}>
        {dish?.name ?? 'Choose dish'}
      </button>
      <button className="text-sm font-semibold text-red-700" onClick={onClear}>
        Clear
      </button>
    </div>
  )
}
