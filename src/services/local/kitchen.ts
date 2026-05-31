import { emptyDayPlan, getTodayKey, getTomorrowKey } from '../../lib/date/plans'
import type {
  DayKey,
  DayPlan,
  Dish,
  ExportPayload,
  LegacySnapshot,
  LocalKitchenState,
  Staple,
  WeeklyPlan,
} from '../../types/domain'
import { buildExportPayload as buildLegacyExportPayload, applyImportPayload } from './importExportService'
import {
  derivePantryItems,
  getDayPlan,
  loadLocalKitchenState,
  normalizeDishId,
  persistIngredients,
  persistIntegrations,
  persistPlan,
  persistRepo,
  persistStaples,
  syncIngredientsFromRepo,
} from './localStorageService'
import { listDishImagesAsDataUrls, listIngredientImagesAsDataUrls } from './imageStore'

export { derivePantryItems, getDayPlan, loadLocalKitchenState as loadKitchenState, normalizeDishId }
export { persistIngredients, persistIntegrations, persistPlan, persistRepo, persistStaples, syncIngredientsFromRepo }

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
  return buildLegacyExportPayload(state)
}

export function applyImport(state: LocalKitchenState, payload: ExportPayload): LocalKitchenState {
  return applyImportPayload(state, payload).nextState
}

export function suggestDishesFromIngredients(repo: Dish[], available: string[], staples: Staple[]) {
  const availableSet = new Set([
    ...available.map((item) => item.toLowerCase()),
    ...staples.map((item) => item.toLowerCase()),
  ])

  return repo.filter((dish) =>
    dish.mainIngredients.every((ingredient) => availableSet.has(ingredient.toLowerCase())),
  )
}

export function computeIngredientsNeeded(
  repo: Dish[],
  plan: WeeklyPlan,
  staples: Staple[],
  scope: 'today' | 'tomorrow' | 'week' | DayKey,
) {
  const stapleSet = new Set(staples.map((item) => item.toLowerCase()))
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
          if (stapleSet.has(ingredient.toLowerCase())) return
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
  staples: Staple[],
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

export function getOverlappingDishes(repo: Dish[], dishId: string, staples: Staple[]) {
  const original = getDishById(repo, dishId)
  if (!original) return []

  const originalSet = new Set(original.mainIngredients.map((ingredient) => ingredient.toLowerCase()))
  const stapleSet = new Set(staples.map((item) => item.toLowerCase()))

  return repo
    .filter((dish) => dish.id !== dishId)
    .map((dish) => {
      const overlap = dish.mainIngredients.filter((ingredient) => {
        const key = ingredient.toLowerCase()
        return !stapleSet.has(key) && originalSet.has(key)
      })
      return { dish, overlap }
    })
    .filter((item) => item.overlap.length > 0)
    .sort((a, b) => b.overlap.length - a.overlap.length)
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
