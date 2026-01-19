export interface Allergens {
  suitableFor?: string[]
  contains?: string[]
  mayContain?: string[]
}

export interface NutritionPer100g {
  energyKcal?: number
  proteinG?: number
  carbG?: number
  sugarsG?: number
  fatG?: number
  satFatG?: number
  saltG?: number
}

export interface MenuItem {
  id: string
  name: string
  dietaryLabels: string[]
  ingredients?: string
  allergens?: Allergens
  nutritionPer100g?: NutritionPer100g
}

export interface MenuCategory {
  name: string
  items: MenuItem[]
}

export interface DayMenu {
  day: string
  categories: MenuCategory[]
}

export interface Menu {
  identifier: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner'
  days: DayMenu[]
}

export interface MenuInfo {
  identifier: string
  name: string
}

export interface ModalDetails {
  ingredients: string
  allergens?: Allergens
  nutritionPer100g?: NutritionPer100g
}
