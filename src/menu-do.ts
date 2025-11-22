import { DurableObject } from 'cloudflare:workers'
import { Menu, DayMenu, MenuItem } from './workflows/lib/types'
import { mapDaysToDate } from './helpers/date-utils'

export interface StoredMenuData {
  menus: Menu[]
  weekStartDate: string // YYYY-MM-DD (Monday)
  dateMap: Record<string, string> // day name -> date
  storedAt: string // ISO timestamp
}

export interface MenuQueryResult {
  date: string
  day: string
  mealType: 'breakfast' | 'lunch'
  menu: MenuCategory[]
}

export interface MenuItemWithContext extends MenuItem {
  date: string
  day: string
  mealType: 'breakfast' | 'lunch'
  category: string
}

export class IntercomMenuDO extends DurableObject<Env, Record<string, unknown>> {
  private storage: DurableObjectStorage
  private sql: SqlStorage
  private static readonly JSON_STORAGE_KEY = 'menu_data'

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.storage = state.storage
    this.sql = state.storage.sql

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS menu_index (
        date TEXT NOT NULL,
        day_name TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        categories_count INTEGER DEFAULT 0,
        items_count INTEGER DEFAULT 0,
        PRIMARY KEY (date, meal_type)
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT NOT NULL,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        category TEXT,
        name TEXT,
        dietary_labels TEXT,
        PRIMARY KEY (id, date, meal_type)
      );

      CREATE INDEX IF NOT EXISTS idx_menu_items_date ON menu_items(date);
      CREATE INDEX IF NOT EXISTS idx_menu_items_dietary ON menu_items(dietary_labels);
    `)
  }

  /**
   * Generate a simple hash for menu comparison
   */
  private generateMenuHash(menus: Menu[]): string {
    // Create a hash based on menu count, item count, and first/last item IDs
    const summary = menus.map(menu => ({
      type: menu.type,
      dayCount: menu.days.length,
      itemCount: menu.days.reduce((sum, day) =>
        sum + day.categories.reduce((catSum, cat) =>
          catSum + cat.items.length, 0), 0),
      firstItemId: menu.days[0]?.categories[0]?.items[0]?.id || '',
      lastDay: menu.days[menu.days.length - 1]?.day || ''
    }))
    return JSON.stringify(summary)
  }

  async setMenuWithDates(menus: Menu[], weekStartDate: string): Promise<void> {
    const existing = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)

    // Use hash comparison instead of full JSON stringification
    if (existing) {
      const existingHash = this.generateMenuHash(existing.menus)
      const newHash = this.generateMenuHash(menus)
      if (existingHash === newHash) {
        console.log('Menu data unchanged (hash match), skipping update')
        return
      }
    }

    const dateMap = mapDaysToDate(weekStartDate)

    const storedData: StoredMenuData = {
      menus,
      weekStartDate,
      dateMap,
      storedAt: new Date().toISOString(),
    }
    await this.storage.put(IntercomMenuDO.JSON_STORAGE_KEY, storedData)

    this.sql.exec(`
      DELETE FROM menu_index;
      DELETE FROM menu_items;
    `)

    for (const menu of menus) {
      const mealType = menu.type

      for (const day of menu.days) {
        const date = dateMap[day.day as keyof typeof dateMap]
        if (!date) continue

        let totalItems = 0
        const itemsToInsert: Array<{
          id: string
          date: string
          mealType: string
          category: string
          name: string
          dietaryLabels: string
        }> = []

        for (const category of day.categories) {
          for (const item of category.items) {
            totalItems++
            itemsToInsert.push({
              id: item.id,
              date,
              mealType,
              category: category.name,
              name: item.name,
              dietaryLabels: item.dietaryLabels?.join(',') || '',
            })
          }
        }

        this.sql.exec(
          `INSERT INTO menu_index (date, day_name, meal_type, categories_count, items_count)
           VALUES (?, ?, ?, ?, ?)`,
          date,
          day.day,
          mealType,
          day.categories.length,
          totalItems,
        )

        // Batch insert menu items
        if (itemsToInsert.length > 0) {
          for (const item of itemsToInsert) {
            this.sql.exec(
              `INSERT INTO menu_items (id, date, meal_type, category, name, dietary_labels)
               VALUES (?, ?, ?, ?, ?, ?)`,
              item.id,
              item.date,
              item.mealType,
              item.category,
              item.name,
              item.dietaryLabels,
            )
          }
        }
      }
    }

    // Set alarm for cleanup (1 year)
    const oneYearMs = 365 * 24 * 60 * 60 * 1000
    await this.storage.setAlarm(Date.now() + oneYearMs)
  }

  /**
   * Get menu for a specific date and optional meal type
   */
  async getMenuByDate(date: string, mealType?: 'breakfast' | 'lunch'): Promise<MenuQueryResult[]> {
    // Check if date exists in index
    const indexQuery = mealType ? `SELECT * FROM menu_index WHERE date = ? AND meal_type = ?` : `SELECT * FROM menu_index WHERE date = ?`

    const cursor = mealType ? await this.sql.exec(indexQuery, date, mealType) : await this.sql.exec(indexQuery, date)

    const indexRows = [...cursor]

    if (indexRows.length === 0) {
      return []
    }

    // Get full menu data
    const storedData = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
    if (!storedData) {
      return []
    }

    const results: MenuQueryResult[] = []
    for (const row of indexRows) {
      const menu = storedData.menus.find((m) => m.type === row.meal_type)

      if (menu) {
        const dayMenu = menu.days.find((d) => storedData.dateMap[d.day] === date)

        if (dayMenu) {
          results.push({
            date: row.date as string,
            day: row.day_name as string,
            mealType: row.meal_type as 'breakfast' | 'lunch',
            menu: dayMenu.categories,
          })
        }
      }
    }

    return results
  }

  /**
   * Search menu items by name or dietary labels
   */
  async searchMenuItems(
    query: string,
    options?: {
      startDate?: string
      endDate?: string
      mealType?: 'breakfast' | 'lunch'
      dietaryLabel?: string
    },
  ): Promise<MenuItemWithContext[]> {
    let sql = `
      SELECT DISTINCT id, date, meal_type, category, name, dietary_labels
      FROM menu_items
      WHERE 1=1
    `
    const params: any[] = []

    if (query) {
      sql += ` AND name LIKE ?`
      params.push(`%${query}%`)
    }

    if (options?.dietaryLabel) {
      sql += ` AND dietary_labels LIKE ?`
      params.push(`%${options.dietaryLabel}%`)
    }

    if (options?.startDate) {
      sql += ` AND date >= ?`
      params.push(options.startDate)
    }

    if (options?.endDate) {
      sql += ` AND date <= ?`
      params.push(options.endDate)
    }

    if (options?.mealType) {
      sql += ` AND meal_type = ?`
      params.push(options.mealType)
    }

    const cursor = await this.sql.exec(sql, ...params)
    const rows = [...cursor]

    // Get full menu data to return complete MenuItem objects with context
    const storedData = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
    if (!storedData) {
      return []
    }

    const items: MenuItemWithContext[] = []
    for (const row of rows) {
      const menu = storedData.menus.find((m) => m.type === row.meal_type)
      const date = row.date as string
      const mealType = row.meal_type as 'breakfast' | 'lunch'
      const categoryName = row.category as string

      if (menu) {
        // Find the day name from the date
        const dayFromDate = Object.entries(storedData.dateMap).find(([_, d]) => d === date)?.[0] || ''

        for (const dayMenu of menu.days) {
          for (const category of dayMenu.categories) {
            const item = category.items.find((i) => i.id === row.id)
            if (item) {
              items.push({
                ...item,
                date,
                day: dayFromDate,
                mealType,
                category: categoryName
              })
              break
            }
          }
        }
      }
    }

    return items
  }

  /**
   * Get all available dates in this DO
   */
  async getAvailableDates(): Promise<{ date: string; meals: string[] }[]> {
    const cursor = await this.sql.exec(`
      SELECT date, GROUP_CONCAT(meal_type) as meals
      FROM menu_index
      GROUP BY date
      ORDER BY date
    `)

    return [...cursor].map((row) => ({
      date: row.date as string,
      meals: (row.meals as string).split(','),
    }))
  }

  /**
   * Get all menus stored in this DO
   */
  async getAllMenus(): Promise<Menu[] | undefined> {
    const storedData = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
    return storedData?.menus
  }

  /**
   * Get full stored data including date mappings
   */
  async getStoredData(): Promise<StoredMenuData | undefined> {
    return await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
  }

  /**
   * Get the date range for this week's stored menu
   */
  async getStoredWeekRange(): Promise<{ startDate: string; endDate: string } | null> {
    const storedData = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
    if (!storedData) return null

    const dates = Object.values(storedData.dateMap).sort()
    if (dates.length === 0) return null

    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1]
    }
  }

  /**
   * Rebuild SQL index from JSON data
   */
  async rebuildIndex(): Promise<void> {
    const storedData = await this.storage.get<StoredMenuData>(IntercomMenuDO.JSON_STORAGE_KEY)
    if (!storedData) {
      console.log('No stored data to rebuild from')
      return
    }

    await this.setMenuWithDates(storedData.menus, storedData.weekStartDate)
    console.log('Index rebuilt successfully')
  }

  /**
   * Clean up expired data
   */
  async alarm(): Promise<void> {
    await this.storage.delete(IntercomMenuDO.JSON_STORAGE_KEY)
    this.sql.exec(`
      DELETE FROM menu_index;
      DELETE FROM menu_items;
    `)
  }
}
