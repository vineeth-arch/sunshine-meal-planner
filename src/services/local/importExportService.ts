import type { Dish, ExportPayload, Ingredient, LocalKitchenState, Staple } from '../../types/domain'
import { derivePantryItems, syncIngredientsFromRepo } from './localStorageService'

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null
}

function normalizeImportedDish(value: unknown): Dish | null {
  if (!value || typeof value !== 'object') return null
  const dish = value as Partial<Dish>
  if (!dish.name || !dish.category) return null

  return {
    id: String(dish.id ?? `${String(dish.name).toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`),
    name: String(dish.name),
    category: dish.category,
    mainIngredients: Array.isArray(dish.mainIngredients)
      ? dish.mainIngredients.map((item) => String(item).trim()).filter(Boolean)
      : [],
    emoji: String(dish.emoji ?? '🥗'),
    bgColor: String(dish.bgColor ?? ''),
    referenceText: String(dish.referenceText ?? ''),
    recipe: String(dish.recipe ?? ''),
    youtube: String(dish.youtube ?? ''),
    image: String(dish.image ?? ''),
  }
}

function normalizeImportedIngredient(value: unknown): Ingredient | null {
  if (!value || typeof value !== 'object') return null
  const ingredient = value as Partial<Ingredient>
  if (!ingredient.name) return null

  return {
    name: String(ingredient.name),
    emoji: String(ingredient.emoji ?? '🥗'),
    malayalam: String(ingredient.malayalam ?? ''),
    gujarati: String(ingredient.gujarati ?? ''),
    image: String(ingredient.image ?? ''),
  }
}

function normalizeImportedStaples(value: unknown): Staple[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))]
}

export function buildExportPayload(state: LocalKitchenState): ExportPayload {
  return {
    version: 1,
    sabjis: state.repo.map((dish) => ({ ...dish })),
    ingredients: state.ingredients.map((ingredient) => ({ ...ingredient })),
    staples: [...state.staples],
  }
}

export function parseImportPayload(text: string) {
  const parsed = JSON.parse(text) as Partial<ExportPayload>
  if (parsed.version !== 1) {
    throw new Error('Unsupported or missing version. Expected schema v1.')
  }

  return {
    version: 1 as const,
    sabjis: Array.isArray(parsed.sabjis) ? parsed.sabjis.map(normalizeImportedDish).filter(isDefined) : [],
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map(normalizeImportedIngredient).filter(isDefined)
      : [],
    staples: normalizeImportedStaples(parsed.staples),
  }
}

export function applyImportPayload(state: LocalKitchenState, payload: ExportPayload) {
  const repoById = new Map(state.repo.map((dish) => [dish.id, dish]))
  const ingredientByName = new Map(
    state.ingredients.map((ingredient) => [ingredient.name.toLowerCase(), ingredient]),
  )
  const nextRepo = [...state.repo]
  const nextIngredients = [...state.ingredients]

  let dishAdd = 0
  let dishUpd = 0
  let ingAdd = 0
  let ingUpd = 0

  payload.sabjis.forEach((dish) => {
    const existing = repoById.get(dish.id)
    if (existing) {
      Object.assign(existing, dish)
      dishUpd += 1
      return
    }

    nextRepo.push({ ...dish })
    repoById.set(dish.id, dish)
    dishAdd += 1
  })

  payload.ingredients.forEach((ingredient) => {
    const key = ingredient.name.toLowerCase()
    const existing = ingredientByName.get(key)
    if (existing) {
      Object.assign(existing, ingredient)
      ingUpd += 1
      return
    }

    nextIngredients.push({ ...ingredient })
    ingredientByName.set(key, ingredient)
    ingAdd += 1
  })

  const mergedStaples = [...new Set([...state.staples, ...payload.staples])]
  const syncedIngredients = syncIngredientsFromRepo(nextRepo, nextIngredients, mergedStaples).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return {
    nextState: {
      ...state,
      repo: nextRepo,
      ingredients: syncedIngredients,
      staples: mergedStaples,
      pantry: derivePantryItems(syncedIngredients, mergedStaples),
    },
    stats: { dishAdd, dishUpd, ingAdd, ingUpd },
  }
}
