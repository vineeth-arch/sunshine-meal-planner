import { createEmptyWeekDays, emptyDayPlan, getTodayKey, getTomorrowKey, getWeekStartDate } from '../../lib/date/plans'
import {
  STORAGE_KEY_INGREDIENTS,
  STORAGE_KEY_INTEGRATIONS,
  STORAGE_KEY_LAST_WEEK,
  STORAGE_KEY_PLAN,
  STORAGE_KEY_REPO,
  STORAGE_KEY_STAPLES,
} from '../../lib/storage/keys'
import type {
  DayKey,
  DayPlan,
  Dish,
  ExportPayload,
  Ingredient,
  Integrations,
  LegacySnapshot,
  LocalKitchenState,
  WeeklyPlan,
} from '../../types/domain'
import { DEFAULT_DISHES, DEFAULT_STAPLES, INGREDIENT_EMOJI_MAP } from './defaults'
import { listDishImagesAsDataUrls, listIngredientImagesAsDataUrls } from './imageStore'

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getStaplesSet(staples: string[]) {
  return new Set(staples.map((item) => item.toLowerCase()))
}

function buildIngredientsFromRepo(repo: Dish[], staples = DEFAULT_STAPLES): Ingredient[] {
  const stapleSet = getStaplesSet(staples)
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
      })
    })
  })

  return ingredients.sort((a, b) => a.name.localeCompare(b.name))
}

function seedPlan(): WeeklyPlan {
  return {
    weekStartingDate: getWeekStartDate(),
    days: createEmptyWeekDays(),
  }
}

export function normalizeDishId(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`
}

export function loadKitchenState(): LocalKitchenState {
  const repo = readJson<Dish[]>(STORAGE_KEY_REPO) ?? DEFAULT_DISHES
  const staples = readJson<string[]>(STORAGE_KEY_STAPLES) ?? DEFAULT_STAPLES
  const integrations = readJson<Integrations>(STORAGE_KEY_INTEGRATIONS) ?? {}
  const storedIngredients = readJson<Ingredient[]>(STORAGE_KEY_INGREDIENTS)
  const lastWeekPlan = readJson<WeeklyPlan>(STORAGE_KEY_LAST_WEEK)
  let plan = readJson<WeeklyPlan>(STORAGE_KEY_PLAN)

  if (!readJson<Dish[]>(STORAGE_KEY_REPO)) writeJson(STORAGE_KEY_REPO, repo)
  if (!readJson<string[]>(STORAGE_KEY_STAPLES)) writeJson(STORAGE_KEY_STAPLES, staples)

  if (!plan) {
    plan = seedPlan()
    writeJson(STORAGE_KEY_PLAN, plan)
  }

  const currentWeekStart = getWeekStartDate()
  if (plan.weekStartingDate !== currentWeekStart) {
    writeJson(STORAGE_KEY_LAST_WEEK, plan)
    plan = seedPlan()
    writeJson(STORAGE_KEY_PLAN, plan)
  }

  const ingredients = storedIngredients ?? buildIngredientsFromRepo(repo, staples)
  if (!storedIngredients) writeJson(STORAGE_KEY_INGREDIENTS, ingredients)

  return {
    repo,
    ingredients,
    staples,
    plan,
    lastWeekPlan,
    integrations,
  }
}

export function persistRepo(repo: Dish[]) {
  writeJson(STORAGE_KEY_REPO, repo)
}

export function persistIngredients(ingredients: Ingredient[]) {
  writeJson(STORAGE_KEY_INGREDIENTS, ingredients)
}

export function persistStaples(staples: string[]) {
  writeJson(STORAGE_KEY_STAPLES, staples)
}

export function persistPlan(plan: WeeklyPlan) {
  writeJson(STORAGE_KEY_PLAN, plan)
}

export function persistIntegrations(integrations: Integrations) {
  writeJson(STORAGE_KEY_INTEGRATIONS, integrations)
}

export function syncIngredientsFromRepo(repo: Dish[], currentIngredients: Ingredient[], staples: string[]) {
  const stapleSet = getStaplesSet(staples)
  const existing = new Map(currentIngredients.map((ingredient) => [ingredient.name.toLowerCase(), ingredient]))
  let changed = false

  repo.forEach((dish) => {
    dish.mainIngredients.forEach((name) => {
      const key = name.toLowerCase()
      if (stapleSet.has(key) || existing.has(key)) return
      existing.set(key, {
        name,
        emoji: INGREDIENT_EMOJI_MAP[key] ?? '🥗',
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

export function updateMealSlot(
  plan: WeeklyPlan,
  day: DayKey,
  meal: keyof DayPlan,
  field: string,
  value: string | string[],
) {
  const next: WeeklyPlan = structuredClone(plan)
  const target = next.days[day] ?? emptyDayPlan()
  const mealTarget = target[meal] as unknown as Record<string, string | string[]>
  mealTarget[field] = value
  next.days[day] = target
  return next
}

export function copyDayPlan(plan: WeeklyPlan, fromDay: DayKey, toDay: DayKey) {
  const next: WeeklyPlan = structuredClone(plan)
  next.days[toDay] = structuredClone(plan.days[fromDay] ?? emptyDayPlan())
  return next
}

export function getDishById(repo: Dish[], id: string) {
  return repo.find((dish) => dish.id === id) ?? null
}

export function buildExportPayload(state: LocalKitchenState): ExportPayload {
  return {
    version: 1,
    sabjis: state.repo.map((dish) => ({ ...dish })),
    ingredients: state.ingredients.map((ingredient) => ({ ...ingredient })),
    staples: [...state.staples],
  }
}

export function applyImport(state: LocalKitchenState, payload: ExportPayload): LocalKitchenState {
  const repoById = new Map(state.repo.map((dish) => [dish.id, dish]))
  const ingredientByName = new Map(state.ingredients.map((ingredient) => [ingredient.name.toLowerCase(), ingredient]))
  const nextRepo = [...state.repo]
  const nextIngredients = [...state.ingredients]

  payload.sabjis.forEach((dish) => {
    if (!dish.name || !dish.category) return
    const existing = repoById.get(dish.id)
    if (existing) Object.assign(existing, dish)
    else {
      nextRepo.push({ ...dish })
      repoById.set(dish.id, dish)
    }
  })

  payload.ingredients.forEach((ingredient) => {
    if (!ingredient.name) return
    const key = ingredient.name.toLowerCase()
    const existing = ingredientByName.get(key)
    if (existing) Object.assign(existing, ingredient)
    else {
      nextIngredients.push({ ...ingredient })
      ingredientByName.set(key, ingredient)
    }
  })

  const mergedStaples = [...new Set([...state.staples, ...payload.staples.map((item) => item.toLowerCase())])]
  const syncedIngredients = syncIngredientsFromRepo(nextRepo, nextIngredients, mergedStaples)

  return {
    ...state,
    repo: nextRepo,
    ingredients: syncedIngredients.sort((a, b) => a.name.localeCompare(b.name)),
    staples: mergedStaples,
  }
}

export function suggestDishesFromIngredients(repo: Dish[], available: string[], staples: string[]) {
  const availableSet = new Set([...available.map((item) => item.toLowerCase()), ...staples.map((item) => item.toLowerCase())])
  return repo.filter((dish) =>
    dish.mainIngredients.every((ingredient) => availableSet.has(ingredient.toLowerCase())),
  )
}

export function computeIngredientsNeeded(
  repo: Dish[],
  plan: WeeklyPlan,
  staples: string[],
  scope: 'today' | 'tomorrow' | 'week' | DayKey,
) {
  const stapleSet = getStaplesSet(staples)
  const dayKeys: DayKey[] =
    scope === 'today'
      ? [getTodayKey()]
      : scope === 'tomorrow'
        ? [getTomorrowKey()]
        : scope === 'week'
          ? (Object.keys(plan.days) as DayKey[])
          : [scope]

  const counts = {
    breakfast: {} as Record<string, number>,
    lunch: {} as Record<string, number>,
    dinner: {} as Record<string, number>,
    total: {} as Record<string, number>,
  }

  dayKeys.forEach((day) => {
    const dayPlan = getDayPlan(plan, day)
    const mealIds = {
      breakfast: [...dayPlan.breakfast.sabjis],
      lunch: [dayPlan.lunch.curry, dayPlan.lunch.sabji, dayPlan.lunch.gujaratiSabji].filter(Boolean),
      dinner: [dayPlan.dinner.curry, ...dayPlan.dinner.sabjis, dayPlan.dinner.gujaratiSabji].filter(Boolean),
    }

    ;(Object.entries(mealIds) as Array<[keyof typeof mealIds, string[]]>).forEach(([meal, ids]) => {
      ids.forEach((id) => {
        const dish = getDishById(repo, id)
        if (!dish) return

        dish.mainIngredients.forEach((ingredient) => {
          const key = ingredient.toLowerCase()
          if (stapleSet.has(key)) return

          counts[meal][ingredient] = (counts[meal][ingredient] ?? 0) + 1
          counts.total[ingredient] = (counts.total[ingredient] ?? 0) + 1
        })
      })
    })
  })

  return counts
}

export function generatePlanFromFridge(
  repo: Dish[],
  plan: WeeklyPlan,
  available: string[],
  staples: string[],
  includeGujarati: boolean,
) {
  let makeable = suggestDishesFromIngredients(repo, available, staples)
  if (!includeGujarati) makeable = makeable.filter((dish) => dish.category !== 'gujarati')

  const shuffle = <T,>(items: T[]) => {
    const next = [...items]
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[next[index], next[swap]] = [next[swap], next[index]]
    }
    return next
  }

  const sabjis = shuffle(makeable.filter((dish) => dish.category === 'sabji'))
  const curries = shuffle(makeable.filter((dish) => dish.category === 'curry'))
  const gujaratis = shuffle(makeable.filter((dish) => dish.category === 'gujarati'))

  let sabjiIndex = 0
  let curryIndex = 0
  let gujaratiIndex = 0
  let filledCount = 0
  const nextPlan = structuredClone(plan)

  const fillDay = (day: DayKey) => {
    const dayPlan = getDayPlan(nextPlan, day)

    if (!dayPlan.breakfast.sabjis[0] && sabjis[sabjiIndex]) {
      dayPlan.breakfast.sabjis = [sabjis[sabjiIndex].id]
      sabjiIndex += 1
      filledCount += 1
    }

    if (dayPlan.breakfast.sabjis[0] && !dayPlan.breakfast.sabjis[1] && sabjis[sabjiIndex]) {
      dayPlan.breakfast.sabjis = [dayPlan.breakfast.sabjis[0], sabjis[sabjiIndex].id]
      sabjiIndex += 1
      filledCount += 1
    }

    if (!dayPlan.lunch.curry && curries[curryIndex]) {
      dayPlan.lunch.curry = curries[curryIndex].id
      curryIndex += 1
      filledCount += 1
    }

    if (!dayPlan.lunch.sabji && sabjis[sabjiIndex]) {
      dayPlan.lunch.sabji = sabjis[sabjiIndex].id
      sabjiIndex += 1
      filledCount += 1
    }

    if (includeGujarati && !dayPlan.lunch.gujaratiSabji && gujaratis[gujaratiIndex]) {
      dayPlan.lunch.gujaratiSabji = gujaratis[gujaratiIndex].id
      gujaratiIndex += 1
      filledCount += 1
    }

    if (!dayPlan.dinner.curry && curries[curryIndex]) {
      dayPlan.dinner.curry = curries[curryIndex].id
      curryIndex += 1
      filledCount += 1
    }

    if (!dayPlan.dinner.sabjis[0] && sabjis[sabjiIndex]) {
      dayPlan.dinner.sabjis = [sabjis[sabjiIndex].id]
      sabjiIndex += 1
      filledCount += 1
    }

    if (dayPlan.dinner.sabjis[0] && !dayPlan.dinner.sabjis[1] && sabjis[sabjiIndex]) {
      dayPlan.dinner.sabjis = [dayPlan.dinner.sabjis[0], sabjis[sabjiIndex].id]
      sabjiIndex += 1
      filledCount += 1
    }

    if (includeGujarati && !dayPlan.dinner.gujaratiSabji && gujaratis[gujaratiIndex]) {
      dayPlan.dinner.gujaratiSabji = gujaratis[gujaratiIndex].id
      gujaratiIndex += 1
      filledCount += 1
    }

    nextPlan.days[day] = dayPlan
  }

  fillDay(getTodayKey())
  fillDay(getTomorrowKey())

  return {
    plan: nextPlan,
    filledCount,
    makeableCount: makeable.length,
  }
}

export async function captureLegacySnapshot(state: LocalKitchenState): Promise<LegacySnapshot> {
  return {
    exportedAt: new Date().toISOString(),
    appVersion: 'react-migration-v1',
    repo: state.repo.map((dish) => ({ ...dish })),
    ingredients: state.ingredients.map((ingredient) => ({ ...ingredient })),
    staples: [...state.staples],
    plan: structuredClone(state.plan),
    lastWeekPlan: state.lastWeekPlan ? structuredClone(state.lastWeekPlan) : null,
    integrations: { ...state.integrations },
    images: {
      dishes: await listDishImagesAsDataUrls(),
      ingredients: await listIngredientImagesAsDataUrls(),
    },
  }
}
