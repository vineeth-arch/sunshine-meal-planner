import type { Timestamp } from 'firebase/firestore'

export type DishCategory = 'sabji' | 'curry' | 'gujarati'
export type UserRole = 'admin' | 'editor' | 'viewer'
export type ProfileKey = 'admin' | 'mom' | 'dad' | 'guest'

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

export type Staple = string

export interface PantryItem {
  id: string
  kind: 'ingredient' | 'staple'
  name: string
  emoji: string
  detail?: string
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

export interface MealPlan {
  weekStartingDate: string
  days: WeeklyPlanDays
}

export type WeeklyPlan = MealPlan

export type MealName = 'breakfast' | 'lunch' | 'dinner'
export type MealSlotField = 'sabjis' | 'curry' | 'sabji' | 'gujaratiSabji'
export type MealSlotKey =
  | 'breakfast-sabjis'
  | 'lunch-curry'
  | 'lunch-sabji'
  | 'lunch-gujarati'
  | 'dinner-curry'
  | 'dinner-sabjis'
  | 'dinner-gujarati'

export interface MealSlot {
  key: MealSlotKey
  meal: MealName
  field: MealSlotField
  label: string
  acceptsCategory: DishCategory | 'any'
  allowsMultiple: boolean
}

export interface Integrations {
  llmBaseUrl?: string
  llmKey?: string
  llmModel?: string
  imgbbKey?: string
}

export interface ProfilePlaceholder {
  displayName: string
  householdLabel: string
  notes: string
}

export interface AppSettings {
  integrations: Integrations
  profile: ProfilePlaceholder
}

export interface ExportPayload {
  version: 1
  sabjis: Dish[]
  ingredients: Ingredient[]
  staples: Staple[]
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
  staples: Staple[]
  plan: WeeklyPlan
  lastWeekPlan: WeeklyPlan | null
  integrations: Integrations
  images: LegacyImageMap
}

export interface LocalKitchenState {
  repo: Dish[]
  ingredients: Ingredient[]
  staples: Staple[]
  pantry: PantryItem[]
  plan: WeeklyPlan
  lastWeekPlan: WeeklyPlan | null
  integrations: Integrations
  settings: AppSettings
  profile: ProfilePlaceholder
}

export interface UserProfile {
  uid: string
  role: UserRole
  householdId: string
  profileKey: ProfileKey
  displayName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Household {
  id: string
  name: string
  ownerUid: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
