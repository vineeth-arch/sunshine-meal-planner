export type PlannerDaySummary = {
  day: string
  breakfast: string
  lunch: string
  dinner: string
}

export type PantrySnapshot = {
  staples: string[]
  lowStock: string[]
  restockSoon: string[]
}

export type PlaceholderDish = {
  name: string
  type: string
  heroIngredient: string
}

export type PlaceholderIngredient = {
  name: string
  note: string
}

export const dashboardStats = [
  { label: 'Planned meals', value: '21' },
  { label: 'Pantry staples', value: '18' },
  { label: 'Family favorites', value: '12' },
  { label: 'Prep reminders', value: '4' },
] as const

export const todaySummary = {
  breakfast: ['Idli', 'Coconut chutney'],
  lunch: ['Moru curry', 'Beans thoran', 'Jeera rice'],
  dinner: ['Chapati', 'Aloo matar', 'Cucumber salad'],
}

export const tomorrowSummary = {
  breakfast: ['Poha', 'Masala chai'],
  lunch: ['Dal tadka', 'Cabbage sabji', 'Phulka'],
  dinner: ['Tomato rice', 'Paneer pepper fry'],
}

export const weekPlannerDays: PlannerDaySummary[] = [
  { day: 'Monday', breakfast: 'Idli', lunch: 'Avial', dinner: 'Chapati + chana' },
  { day: 'Tuesday', breakfast: 'Poha', lunch: 'Dal + bhindi', dinner: 'Lemon rice' },
  { day: 'Wednesday', breakfast: 'Upma', lunch: 'Sambar', dinner: 'Thepla + potato curry' },
  { day: 'Thursday', breakfast: 'Dosa', lunch: 'Kadhi + rice', dinner: 'Veg pulao' },
  { day: 'Friday', breakfast: 'Paratha', lunch: 'Mixed veg curry', dinner: 'Curd rice' },
  { day: 'Saturday', breakfast: 'Appam', lunch: 'Stew', dinner: 'Pav bhaji' },
  { day: 'Sunday', breakfast: 'Puttu', lunch: 'Special family lunch', dinner: 'Soup + toast' },
]

export const pantrySnapshot: PantrySnapshot = {
  staples: ['Rice', 'Toor dal', 'Coconut oil', 'Turmeric', 'Mustard seeds'],
  lowStock: ['Onions', 'Tomatoes', 'Yogurt'],
  restockSoon: ['Curry leaves', 'Paneer', 'Green chilies'],
}

export const placeholderDishes: PlaceholderDish[] = [
  { name: 'Avial', type: 'Kerala lunch', heroIngredient: 'Mixed vegetables' },
  { name: 'Aloo matar', type: 'Weeknight dinner', heroIngredient: 'Potato' },
  { name: 'Kadhi', type: 'Gujarati comfort', heroIngredient: 'Yogurt' },
  { name: 'Paneer pepper fry', type: 'Special dinner', heroIngredient: 'Paneer' },
]

export const placeholderIngredients: PlaceholderIngredient[] = [
  { name: 'Drumstick', note: 'Great for sambar and avial' },
  { name: 'Curry leaves', note: 'Needs a better freshness tracker later' },
  { name: 'Paneer', note: 'Placeholder for future stock and expiry metadata' },
  { name: 'Bottle gourd', note: 'Useful for Gujarati sabji rotation' },
]

export const adminHighlights = [
  'Legacy localStorage keys remain untouched for migration safety.',
  'Supabase cloud sync gates the active route flow.',
  'This phase focuses on routes, layout, and placeholder data only.',
] as const
