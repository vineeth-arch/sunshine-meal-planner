export type DishCategory = 'sabji' | 'curry' | 'gujarati'
export type UserRole = 'admin' | 'member'

export interface Dish {
  id: string
  name: string
  category: DishCategory
  mainIngredients: string[]
  emoji: string
  bgColor: string
  referenceText?: string
  recipe?: string
  youtube?: string
  image?: string
}

export interface Ingredient {
  name: string
  emoji: string
  malayalam?: string
  gujarati?: string
  image?: string
}

export interface MealBreakfast {
  sabjis: string[]
}

export interface MealLunch {
  curry: string
  sabji: string
  gujaratiSabji: string
}

export interface MealDinner {
  curry: string
  sabjis: string[]
  gujaratiSabji: string
}

export interface DayPlan {
  breakfast: MealBreakfast
  lunch: MealLunch
  dinner: MealDinner
}

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type WeeklyPlanDays = Record<DayKey, DayPlan>

export interface WeeklyPlan {
  weekStartingDate: string
  days: WeeklyPlanDays
}

export interface Integrations {
  llmBaseUrl?: string
  llmKey?: string
  llmModel?: string
  imgbbKey?: string
}

export interface ExportPayload {
  version: 1
  sabjis: Dish[]
  ingredients: Ingredient[]
  staples: string[]
}

export interface LegacyImageMap {
  dishes: Record<string, string>
  ingredients: Record<string, string>
}

export interface LegacySnapshot {
  exportedAt: string
  appVersion: string
  repo: Dish[]
  ingredients: Ingredient[]
  staples: string[]
  plan: WeeklyPlan
  lastWeekPlan: WeeklyPlan | null
  integrations: Integrations
  images: LegacyImageMap
}

export interface LocalKitchenState {
  repo: Dish[]
  ingredients: Ingredient[]
  staples: string[]
  plan: WeeklyPlan
  lastWeekPlan: WeeklyPlan | null
  integrations: Integrations
}

export interface UserProfile {
  uid: string
  email: string | null
  role: UserRole
  householdId: string | null
  displayName?: string | null
}

export interface HouseholdMeta {
  id: string
  name: string
  createdAt?: unknown
  updatedAt?: unknown
}
