export type DishCategory = 'sabji' | 'curry' | 'gujarati'
export type UserRole = 'admin' | 'editor' | 'member'
export type CloudTimestamp = string

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
  quantity?: string
  unit?: string
  status?: string
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
  isSuperadmin: boolean
  displayName: string
  email: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
  lastLoginAt?: CloudTimestamp | null
}

export interface Household {
  id: string
  name: string
  ownerUid: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export interface HouseholdDocument {
  id: string
  name: string
  ownerUid: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export interface DishDocument {
  id: string
  name: string
  category: DishCategory
  mainIngredients: string[]
  emoji: string
  recipe: string
  youtubeUrl: string
  referenceText: string
  imageUrl: string
  createdBy: string
  updatedBy: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export interface CreateDishInput {
  id?: string
  name: string
  category: DishCategory
  mainIngredients?: string[]
  emoji?: string
  recipe?: string
  youtubeUrl?: string
  referenceText?: string
  imageUrl?: string
}

export interface UpdateDishInput {
  name?: string
  category?: DishCategory
  mainIngredients?: string[]
  emoji?: string
  recipe?: string
  youtubeUrl?: string
  referenceText?: string
  imageUrl?: string
}

export interface IngredientDocument {
  id: string
  name: string
  emoji: string
  malayalamName: string
  gujaratiName: string
  imageUrl: string
  createdBy: string
  updatedBy: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export interface CreateIngredientInput {
  id?: string
  name: string
  emoji?: string
  malayalamName?: string
  gujaratiName?: string
  imageUrl?: string
}

export interface UpdateIngredientInput {
  name?: string
  emoji?: string
  malayalamName?: string
  gujaratiName?: string
  imageUrl?: string
}

export interface PantryItemDocument {
  id: string
  ingredientId: string
  kind: 'ingredient' | 'staple'
  name: string
  quantity: string
  unit: string
  status: string
  updatedBy: string
  updatedAt: CloudTimestamp
}

export interface UpsertPantryItemInput {
  ingredientId: string
  kind?: 'ingredient' | 'staple'
  name: string
  quantity: string
  unit: string
  status: string
}

export interface StapleDocument {
  id: string
  name: string
  createdBy: string
  updatedBy: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export type KitchenSyncState = 'idle' | 'saving' | 'saved' | 'failed'

export interface KitchenImportStats {
  dishAdd: number
  dishUpd: number
  ingAdd: number
  ingUpd: number
  stapleAdd: number
  stapleUpd: number
}

export interface MigrationPreview {
  hasLegacyData: boolean
  hasLocalImages: boolean
  dishes: Dish[]
  ingredients: Ingredient[]
  staples: Staple[]
  plan: WeeklyPlan | null
}

export interface MigrationSummary {
  created: number
  updated: number
  skipped: number
  failed: number
  failures: string[]
}

export interface WeeklyPlanDocument {
  id: string
  weekStart: string
  createdBy: string
  updatedBy: string
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
}

export interface MealSlotDocument {
  id: string
  day: DayKey
  mealType: MealName
  slotType: string
  dishId: string
  position: number
  notes: string
  updatedBy: string
  updatedAt: CloudTimestamp
}

export interface UpdateMealSlotInput {
  day: DayKey
  mealType: MealName
  slotType: string
  dishId: string
  position: number
  notes?: string
}

export interface HouseholdSettingsDocument {
  id: 'app'
  schemaVersion: number
  regionPreferences: string[]
  enabledMealTypes: MealName[]
  updatedAt: CloudTimestamp
  roleLabels?: Partial<Record<UserRole, string>>
}

export interface UpdateHouseholdSettingsInput {
  schemaVersion?: number
  regionPreferences?: string[]
  enabledMealTypes?: MealName[]
  roleLabels?: Partial<Record<UserRole, string>>
}

export interface AdminRecentChange {
  id: string
  collection: 'dishes' | 'ingredients' | 'staples' | 'pantryItems' | 'weeklyPlans' | 'mealSlots'
  label: string
  updatedBy: string
  updatedAt: CloudTimestamp
}

export interface AdminDataCounts {
  dishes: number
  ingredients: number
  pantryItems: number
  weeklyPlans: number
}

export interface AdminHouseholdOverview {
  household: AdminBackupHousehold
  profiles: AdminBackupUserProfile[]
  counts: AdminDataCounts
  recentChanges: Array<AdminRecentChange & { householdId: string }>
}

export interface AdminAllHouseholdsOverview {
  households: AdminHouseholdOverview[]
  profiles: AdminBackupUserProfile[]
  counts: {
    households: number
    profiles: number
    dishes: number
    ingredients: number
    pantryItems: number
    weeklyPlans: number
  }
}

export interface AdminRoleLabels {
  admin: string
  editor: string
  member: string
}

export interface AdminBackupUserProfile {
  uid: string
  role: UserRole
  householdId: string
  isSuperadmin: boolean
  displayName: string
  email: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
}

export interface AdminBackupHousehold {
  id: string
  name: string
  ownerUid: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackupSettings {
  schemaVersion: number
  regionPreferences: string[]
  enabledMealTypes: MealName[]
  roleLabels?: Partial<Record<UserRole, string>>
}

export interface AdminBackupDish {
  id: string
  name: string
  category: DishCategory
  mainIngredients: string[]
  emoji: string
  recipe: string
  youtubeUrl: string
  referenceText: string
  imageUrl: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackupIngredient {
  id: string
  name: string
  emoji: string
  malayalamName: string
  gujaratiName: string
  imageUrl: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackupStaple {
  id: string
  name: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackupPantryItem {
  id: string
  ingredientId: string
  kind: 'ingredient' | 'staple'
  name: string
  quantity: string
  unit: string
  status: string
  updatedBy: string
  updatedAt: string
}

export interface AdminBackupWeeklyPlan {
  id: string
  weekStart: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackupMealSlot {
  id: string
  planId: string
  day: DayKey
  mealType: MealName
  slotType: string
  dishId: string
  position: number
  notes: string
  updatedBy: string
  updatedAt: string
}

export interface AdminBackupPayload {
  version: 1
  exportedAt: string
  exportedBy: string
  householdId: string
  household: AdminBackupHousehold
  profiles: AdminBackupUserProfile[]
  settings: AdminBackupSettings | null
  dishes: AdminBackupDish[]
  ingredients: AdminBackupIngredient[]
  staples: AdminBackupStaple[]
  pantryItems: AdminBackupPantryItem[]
  weeklyPlans: AdminBackupWeeklyPlan[]
  mealSlots: AdminBackupMealSlot[]
}

export interface AdminImportPreview {
  payload: AdminBackupPayload
  counts: {
    profiles: number
    dishes: number
    ingredients: number
    staples: number
    pantryItems: number
    weeklyPlans: number
    mealSlots: number
  }
  operations: {
    profiles: { add: number; update: number }
    dishes: { add: number; update: number }
    ingredients: { add: number; update: number }
    staples: { add: number; update: number }
    pantryItems: { add: number; update: number }
    weeklyPlans: { add: number; update: number }
    mealSlots: { add: number; update: number }
  }
}

export interface AdminImportResult {
  profiles: { add: number; update: number }
  dishes: { add: number; update: number }
  ingredients: { add: number; update: number }
  staples: { add: number; update: number }
  pantryItems: { add: number; update: number }
  weeklyPlans: { add: number; update: number }
  mealSlots: { add: number; update: number }
}
