import { createEmptyWeekDays, emptyDayPlan, getWeekStartDate } from '../../lib/date/plans'
import {
  STORAGE_KEY_INGREDIENTS,
  STORAGE_KEY_INTEGRATIONS,
  STORAGE_KEY_LAST_WEEK,
  STORAGE_KEY_PLAN,
  STORAGE_KEY_REPO,
  STORAGE_KEY_STAPLES,
} from '../../lib/storage/keys'
import type {
  AppSettings,
  DayKey,
  DayPlan,
  Dish,
  DishCategory,
  Ingredient,
  Integrations,
  LocalKitchenState,
  MealPlan,
  PantryItem,
  ProfilePlaceholder,
  Staple,
  WeeklyPlan,
} from '../../types/domain'
import { DEFAULT_DISHES, DEFAULT_STAPLES, INGREDIENT_EMOJI_MAP } from './defaults'

const DEFAULT_PROFILE: ProfilePlaceholder = {
  displayName: 'Family kitchen',
  householdLabel: "Mom's Kitchen",
  notes: 'Local-only profile placeholder for the React migration.',
}

const DEFAULT_INTEGRATIONS: Integrations = {}

const DISH_COLORS: Record<DishCategory, string> = {
  sabji: '#d4edda',
  curry: '#fff3cd',
  gujarati: '#e2d9f3',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson<T>(key: string): { value: T | null; exists: boolean; corrupted: boolean } {
  const raw = localStorage.getItem(key)
  if (raw === null) return { value: null, exists: false, corrupted: false }

  try {
    return { value: JSON.parse(raw) as T, exists: true, corrupted: false }
  } catch {
    return { value: null, exists: true, corrupted: true }
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null
}

function normalizeDish(value: unknown, fallbackId = ''): Dish | null {
  if (!isObject(value)) return null
  const name = String(value.name ?? '').trim()
  const category = String(value.category ?? '').trim() as DishCategory
  if (!name || !['sabji', 'curry', 'gujarati'].includes(category)) return null

  const id = String(value.id ?? fallbackId ?? '').trim() || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`
  return {
    id,
    name,
    category,
    mainIngredients: sanitizeStringArray(value.mainIngredients),
    emoji: String(value.emoji ?? '🥗').trim() || '🥗',
    bgColor: String(value.bgColor ?? DISH_COLORS[category]),
    referenceText: String(value.referenceText ?? '').trim(),
    recipe: String(value.recipe ?? '').trim(),
    youtube: String(value.youtube ?? '').trim(),
    image: String(value.image ?? '').trim(),
  }
}

function normalizeIngredient(value: unknown): Ingredient | null {
  if (!isObject(value)) return null
  const name = String(value.name ?? '').trim()
  if (!name) return null
  const key = name.toLowerCase()

  return {
    name,
    emoji: String(value.emoji ?? INGREDIENT_EMOJI_MAP[key] ?? '🥗').trim() || '🥗',
    malayalam: String(value.malayalam ?? '').trim(),
    gujarati: String(value.gujarati ?? '').trim(),
    image: String(value.image ?? '').trim(),
  }
}

function normalizeStaples(value: unknown): Staple[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))]
}

function normalizeDayPlan(value: unknown): DayPlan {
  const input = isObject(value) ? value : {}

  return {
    breakfast: {
      sabjis: sanitizeStringArray(input.breakfast && isObject(input.breakfast) ? input.breakfast.sabjis : []),
    },
    lunch: {
      curry: String(input.lunch && isObject(input.lunch) ? input.lunch.curry ?? '' : ''),
      sabji: String(input.lunch && isObject(input.lunch) ? input.lunch.sabji ?? '' : ''),
      gujaratiSabji: String(input.lunch && isObject(input.lunch) ? input.lunch.gujaratiSabji ?? '' : ''),
    },
    dinner: {
      curry: String(input.dinner && isObject(input.dinner) ? input.dinner.curry ?? '' : ''),
      sabjis: sanitizeStringArray(input.dinner && isObject(input.dinner) ? input.dinner.sabjis : []),
      gujaratiSabji: String(input.dinner && isObject(input.dinner) ? input.dinner.gujaratiSabji ?? '' : ''),
    },
  }
}

function normalizePlan(value: unknown): WeeklyPlan | null {
  if (!isObject(value)) return null
  const weekStartingDate = String(value.weekStartingDate ?? '').trim() || getWeekStartDate()
  const rawDays = isObject(value.days) ? value.days : {}
  const days = createEmptyWeekDays()

  for (const day of Object.keys(days) as DayKey[]) {
    days[day] = normalizeDayPlan(rawDays[day])
  }

  return { weekStartingDate, days }
}

function buildIngredientsFromRepo(repo: Dish[], staples: Staple[]) {
  const stapleSet = new Set(staples.map((item) => item.toLowerCase()))
  const seen = new Set<string>()
  const ingredients: Ingredient[] = []

  repo.forEach((dish) => {
    dish.mainIngredients.forEach((ingredient) => {
      const key = ingredient.toLowerCase()
      if (seen.has(key) || stapleSet.has(key)) return
      seen.add(key)
      ingredients.push({
        name: ingredient,
        emoji: INGREDIENT_EMOJI_MAP[key] ?? '🥗',
        malayalam: '',
        gujarati: '',
        image: '',
      })
    })
  })

  return ingredients.sort((a, b) => a.name.localeCompare(b.name))
}

function seedPlan(): MealPlan {
  return {
    weekStartingDate: getWeekStartDate(),
    days: createEmptyWeekDays(),
  }
}

function buildPantryItems(ingredients: Ingredient[], staples: Staple[]): PantryItem[] {
  const stapleItems: PantryItem[] = staples.map((staple) => ({
    id: `staple:${staple}`,
    kind: 'staple',
    name: staple,
    emoji: '🧂',
    detail: 'Staple pantry item',
  }))

  const ingredientItems: PantryItem[] = ingredients.map((ingredient) => ({
    id: `ingredient:${ingredient.name.toLowerCase()}`,
    kind: 'ingredient',
    name: ingredient.name,
    emoji: ingredient.emoji || '🥗',
    detail: [ingredient.malayalam, ingredient.gujarati].filter(Boolean).join(' · '),
    image: ingredient.image,
  }))

  return [...ingredientItems, ...stapleItems]
}

function normalizeIntegrations(value: unknown): Integrations {
  if (!isObject(value)) return {}
  return {
    llmBaseUrl: String(value.llmBaseUrl ?? '').trim(),
    llmKey: String(value.llmKey ?? '').trim(),
    llmModel: String(value.llmModel ?? '').trim(),
    imgbbKey: String(value.imgbbKey ?? '').trim(),
  }
}

export function buildAppSettings(integrations: Integrations, profile = DEFAULT_PROFILE): AppSettings {
  return {
    integrations,
    profile,
  }
}

export function normalizeDishId(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`
}

export function loadLocalKitchenState(): LocalKitchenState {
  const repoResult = readJson<unknown>(STORAGE_KEY_REPO)
  const staplesResult = readJson<unknown>(STORAGE_KEY_STAPLES)
  const ingredientsResult = readJson<unknown>(STORAGE_KEY_INGREDIENTS)
  const planResult = readJson<unknown>(STORAGE_KEY_PLAN)
  const lastWeekResult = readJson<unknown>(STORAGE_KEY_LAST_WEEK)
  const integrationsResult = readJson<unknown>(STORAGE_KEY_INTEGRATIONS)

  const repo = Array.isArray(repoResult.value)
    ? repoResult.value.map((dish, index) => normalizeDish(dish, `dish-${index}`)).filter(isDefined)
    : null
  const staples = normalizeStaples(staplesResult.value)
  const storedIngredients = Array.isArray(ingredientsResult.value)
    ? ingredientsResult.value.map((ingredient) => normalizeIngredient(ingredient)).filter(isDefined)
    : null
  let plan = normalizePlan(planResult.value)
  let lastWeekPlan = normalizePlan(lastWeekResult.value)
  const integrations = normalizeIntegrations(integrationsResult.value ?? DEFAULT_INTEGRATIONS)

  const nextRepo = repo && repo.length > 0 ? repo : DEFAULT_DISHES
  const nextStaples = staples.length > 0 ? staples : DEFAULT_STAPLES
  const nextIngredients =
    storedIngredients && storedIngredients.length > 0
      ? storedIngredients
      : buildIngredientsFromRepo(nextRepo, nextStaples)

  if (!plan) {
    plan = seedPlan()
  }

  const currentWeekStart = getWeekStartDate()
  if (plan.weekStartingDate !== currentWeekStart) {
    lastWeekPlan = plan
    plan = seedPlan()
  }

  return {
    repo: nextRepo,
    ingredients: nextIngredients,
    staples: nextStaples,
    pantry: buildPantryItems(nextIngredients, nextStaples),
    plan,
    lastWeekPlan,
    integrations,
    settings: buildAppSettings(integrations),
    profile: DEFAULT_PROFILE,
  }
}

export function persistRepo(repo: Dish[]) {
  writeJson(STORAGE_KEY_REPO, repo)
}

export function persistIngredients(ingredients: Ingredient[]) {
  writeJson(STORAGE_KEY_INGREDIENTS, ingredients)
}

export function persistStaples(staples: Staple[]) {
  writeJson(STORAGE_KEY_STAPLES, staples)
}

export function persistPlan(plan: WeeklyPlan) {
  writeJson(STORAGE_KEY_PLAN, plan)
}

export function persistLastWeekPlan(plan: WeeklyPlan | null) {
  writeJson(STORAGE_KEY_LAST_WEEK, plan)
}

export function persistIntegrations(integrations: Integrations) {
  writeJson(STORAGE_KEY_INTEGRATIONS, integrations)
}

export function derivePantryItems(ingredients: Ingredient[], staples: Staple[]) {
  return buildPantryItems(ingredients, staples)
}

export function syncIngredientsFromRepo(repo: Dish[], currentIngredients: Ingredient[], staples: Staple[]) {
  const stapleSet = new Set(staples.map((item) => item.toLowerCase()))
  const existing = new Map(currentIngredients.map((ingredient) => [ingredient.name.toLowerCase(), ingredient]))
  let changed = false

  repo.forEach((dish) => {
    dish.mainIngredients.forEach((ingredientName) => {
      const key = ingredientName.toLowerCase()
      if (stapleSet.has(key) || existing.has(key)) return
      existing.set(key, {
        name: ingredientName,
        emoji: INGREDIENT_EMOJI_MAP[key] ?? '🥗',
        malayalam: '',
        gujarati: '',
        image: '',
      })
      changed = true
    })
  })

  const next = [...existing.values()].sort((a, b) => a.name.localeCompare(b.name))
  return changed ? next : currentIngredients
}

export function getDayPlan(plan: WeeklyPlan, day: DayKey): DayPlan {
  return plan.days[day] ?? emptyDayPlan()
}

export function makeSafeStorageSnapshot(state: LocalKitchenState): LocalKitchenState {
  return {
    ...state,
    repo: state.repo.map((dish) => ({ ...dish })),
    ingredients: state.ingredients.map((ingredient) => ({ ...ingredient })),
    staples: [...state.staples],
    pantry: derivePantryItems(state.ingredients, state.staples),
    plan: structuredClone(state.plan),
    lastWeekPlan: state.lastWeekPlan ? structuredClone(state.lastWeekPlan) : null,
    integrations: { ...state.integrations },
    settings: buildAppSettings({ ...state.integrations }, { ...state.profile }),
    profile: { ...state.profile },
  }
}

export function isCorruptedStorageKey(key: string) {
  return readJson<unknown>(key).corrupted
}

export function readRawStorageValue(key: string) {
  return localStorage.getItem(key)
}
