import puppeteer, { Page } from '@cloudflare/puppeteer'
import type { ModalDetails, MenuInfo, Menu, DayMenu, MenuCategory, MenuItem } from './types'

// ============================================================================
// Constants
// ============================================================================

const DIETARY_LABEL_MAP: Record<string, string> = {
  '52': 'Vegan',
  '50': 'Vegetarian',
  '23': 'Celery',
  '77': 'Crustaceans',
  '22': 'Eggs',
  '21': 'Fish',
  '24': 'Gluten',
  '25': 'Lupin',
  '26': 'Milk',
  '27': 'Molluscs',
  '28': 'Mustard',
  '29': 'Nuts',
  '30': 'Peanuts',
  '31': 'Sesame',
  '32': 'Soya',
  '33': 'Sulphites',
}

// ============================================================================
// Helper Functions
// ============================================================================

async function closeModal(page: Page): Promise<void> {
  const closeButton = await page.$('.k10-recipe-modal.show .close')
  if (closeButton) {
    await closeButton.click()
  } else {
    const modal = await page.$('.k10-recipe-modal.show')
    if (modal) {
      await modal.evaluate((el) => {
        const elementWithClassList = el as unknown as {
          classList: { remove: (...tokens: string[]) => void }
        }
        elementWithClassList.classList.remove('show')
      })
    }
    const backdrop = await page.$('.modal-backdrop')
    if (backdrop) {
      await backdrop.evaluate((el) => el.remove())
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 300))
}

async function openModal(page: Page, recipeId: string): Promise<void> {
  await page.evaluate((id) => {
    const modal = document.querySelector(`.k10-recipe-modal[data-recipe-id="${id}"]`)
    if (!modal) return

    // @ts-expect-error - jQuery may exist in browser
    if (typeof window.$ !== 'undefined') {
      // @ts-expect-error - jQuery modal method
      window.$(modal).modal('show')
    } else {
      modal.classList.add('show', 'in')
      modal.setAttribute('style', 'display: block;')
      const backdrop = document.createElement('div')
      backdrop.className = 'modal-backdrop fade in'
      document.body.appendChild(backdrop)
    }
  }, recipeId)

  await new Promise((resolve) => setTimeout(resolve, 500))
  await page.waitForSelector('.k10-recipe-modal.show', { timeout: 3000 })
}

async function extractModalDetails(page: Page, recipeId: string): Promise<ModalDetails | null> {
  return page.evaluate((id) => {
    const modal = document.querySelector(`.k10-recipe-modal[data-recipe-id="${id}"]`)
    if (!modal) return null

    const ingredientEl = modal.querySelector('.k10-w-recipe__ingredient')
    const ingredients = ingredientEl?.textContent?.trim() || ''

    function parseAllergenField(selector: string): string[] | undefined {
      const element = modal!.querySelector(selector)
      if (!element) return undefined
      const text = element.textContent?.trim() || ''
      if (!text) return undefined
      return text
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
    }

    const suitableFor = parseAllergenField('.k10-recipe-modal__allergens_suitable .k10-recipe-modal__allergens_value')
    const contains = parseAllergenField('.k10-recipe-modal__allergens_contains .k10-recipe-modal__allergens_value')
    const mayContain = parseAllergenField('.k10-recipe-modal__allergens_may .k10-recipe-modal__allergens_value')

    const hasAllergens = suitableFor || contains || mayContain
    const allergens = hasAllergens
      ? {
          ...(suitableFor && { suitableFor }),
          ...(contains && { contains }),
          ...(mayContain && { mayContain }),
        }
      : undefined

    // Extract nutrition (per 100g)
    const nutritionPer100g: ModalDetails['nutritionPer100g'] = {}
    const nutrientRows = modal.querySelectorAll('.k10-recipe-modal__nutrients-table tr[data-nutr-name]')

    nutrientRows.forEach((row) => {
      const nutrientName = row.getAttribute('data-nutr-name')
      const valueEl = row.querySelector('.k10-recipe-modal__td_val')
      const value = valueEl?.textContent?.trim()

      if (nutrientName && value) {
        const numValue = parseFloat(value)
        if (!isNaN(numValue) && nutritionPer100g) {
          switch (nutrientName) {
            case 'Energy (kCal)':
              nutritionPer100g.energyKcal = numValue
              break
            case 'Protein (g)':
              nutritionPer100g.proteinG = numValue
              break
            case 'Carb (g)':
              nutritionPer100g.carbG = numValue
              break
            case 'of which Sugars (g)':
              nutritionPer100g.sugarsG = numValue
              break
            case 'Fat (g)':
              nutritionPer100g.fatG = numValue
              break
            case 'Sat Fat (g)':
              nutritionPer100g.satFatG = numValue
              break
            case 'Salt (g)':
              nutritionPer100g.saltG = numValue
              break
          }
        }
      }
    })

    const hasNutrition = Object.keys(nutritionPer100g).length > 0

    return {
      ingredients,
      allergens,
      nutritionPer100g: hasNutrition ? nutritionPer100g : undefined,
    }
  }, recipeId)
}

async function extractMenuStructure(page: Page): Promise<DayMenu[]> {
  const allDays = await page.evaluate((labelMap) => {
    function mapLabels(labelIds: string): string[] {
      if (!labelIds || labelIds.trim() === '') return []
      return labelIds
        .split(',')
        .map((id) => labelMap[id.trim()])
        .filter((label) => !!label)
    }

    const days: DayMenu[] = []
    const dayElements = document.querySelectorAll('.k10-course.k10-course_level_1')

    dayElements.forEach((dayEl) => {
      const dayName = dayEl.querySelector('.k10-course__name')?.textContent?.trim()
      if (!dayName) return

      const categories: MenuCategory[] = []
      const categoryElements = dayEl.querySelectorAll('.k10-course.k10-course_level_2')

      categoryElements.forEach((catEl) => {
        const categoryName = catEl.querySelector('.k10-course__name')?.textContent?.trim()
        if (!categoryName) return

        const items: MenuItem[] = []
        const itemElements = catEl.querySelectorAll('.k10-recipe.k10-recipe_menu-item')

        itemElements.forEach((itemEl) => {
          const modal = itemEl.querySelector('.k10-recipe-modal')
          const id = modal?.getAttribute('data-recipe-id') || ''
          const name = itemEl.querySelector('.k10-recipe__name')?.textContent?.trim() || ''
          const labels = itemEl.getAttribute('data-labels') || ''

          items.push({
            id,
            name,
            dietaryLabels: mapLabels(labels),
          })
        })

        if (items.length > 0) {
          categories.push({ name: categoryName, items })
        }
      })

      if (categories.length > 0) {
        days.push({ day: dayName, categories })
      }
    })

    return days
  }, DIETARY_LABEL_MAP)

  // Deduplicate days by name (HTML may have duplicate sections)
  const uniqueDaysMap = new Map<string, DayMenu>()
  for (const day of allDays) {
    if (!uniqueDaysMap.has(day.day)) {
      uniqueDaysMap.set(day.day, day)
    }
  }

  return Array.from(uniqueDaysMap.values())
}

async function processMenu(page: Page, menuInfo: MenuInfo): Promise<Menu> {
  console.log(`Processing menu: ${menuInfo.name}`)

  // Click to select this menu
  await page.evaluate((identifier) => {
    const menuOption = document.querySelector(`.k10-menu-selector__options-li[data-menu-identifier="${identifier}"]`)
    //@ts-expect-error
    menuOption?.click()
  }, menuInfo.identifier)

  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Extract menu structure (already deduplicated)
  const uniqueDays = await extractMenuStructure(page)

  // Create a map of item details by ID (will store enriched data)
  const itemDetailsById = new Map<string, ModalDetails>()

  // Collect all unique item IDs to fetch details for
  const uniqueItemIds = new Set<string>()
  for (const day of uniqueDays) {
    for (const category of day.categories) {
      for (const item of category.items) {
        if (item.id) {
          uniqueItemIds.add(item.id)
        }
      }
    }
  }

  console.log(`Found ${uniqueItemIds.size} unique items in ${menuInfo.name}`)

  // Extract details for each unique item ID
  for (const itemId of uniqueItemIds) {
    // Find any item with this ID to get the name
    let itemName = ''
    for (const day of uniqueDays) {
      for (const category of day.categories) {
        const item = category.items.find((i) => i.id === itemId)
        if (item) {
          itemName = item.name
          break
        }
      }
      if (itemName) break
    }

    console.log(`Extracting details: ${itemName} (${itemId})`)

    try {
      await openModal(page, itemId)
      const details = await extractModalDetails(page, itemId)
      if (details) {
        itemDetailsById.set(itemId, details)
      }
      await closeModal(page)
    } catch (error) {
      console.error(`Error extracting details for ${itemName} (${itemId}):`, error)
      await closeModal(page).catch(() => {})
    }
  }

  // Now enrich all items with their details
  for (const day of uniqueDays) {
    for (const category of day.categories) {
      for (const item of category.items) {
        if (item.id && itemDetailsById.has(item.id)) {
          const details = itemDetailsById.get(item.id)!
          item.ingredients = details.ingredients
          item.allergens = details.allergens
          item.nutritionPer100g = details.nutritionPer100g
        }
      }
    }
  }

  const menuName = menuInfo.name.toLowerCase()
  let menuType: 'breakfast' | 'lunch' | 'dinner'
  if (menuName.includes('breakfast')) {
    menuType = 'breakfast'
  } else if (menuName.includes('dinner')) {
    menuType = 'dinner'
  } else {
    menuType = 'lunch'
  }

  return {
    identifier: menuInfo.identifier,
    name: menuInfo.name,
    type: menuType,
    days: uniqueDays,
  }
}

// ============================================================================
// Main Export
// ============================================================================

export async function fetchLondonMenu(env: Cloudflare.Env): Promise<Menu[]> {
  if (!env.LONDON_MENU_URL || env.LONDON_MENU_URL.trim() === '') {
    throw new Error('LONDON_MENU_URL is not set')
  }

  const browser = await puppeteer.launch(env.BROWSER, { location: 'GB' })

  try {
    const page = await browser.newPage()
    await page.goto(env.LONDON_MENU_URL, { waitUntil: 'networkidle0' })

    // Extract available menus
    const menuElements = await page.$$('.k10-menu-selector__options-li')
    const menuList: MenuInfo[] = await Promise.all(
      menuElements.map(async (element) => {
        const identifier = (await element.evaluate((el) => {
          const elementWithAttr = el as unknown as {
            getAttribute(name: string): string | null
          }
          return elementWithAttr.getAttribute('data-menu-identifier') || ''
        })) as string

        const name = (await element.evaluate((el) => {
          const elementWithText = el as unknown as {
            textContent: string | null
          }
          return elementWithText.textContent?.trim() || ''
        })) as string

        return { identifier, name }
      }),
    )

    // Deduplicate menus by identifier
    const uniqueMenuMap = new Map<string, MenuInfo>()
    for (const menu of menuList) {
      if (menu.identifier && !uniqueMenuMap.has(menu.identifier)) {
        uniqueMenuMap.set(menu.identifier, menu)
      }
    }
    const availableMenus = Array.from(uniqueMenuMap.values())

    console.log('Found menus:', availableMenus)

    // Process each menu
    const result: Menu[] = []
    for (const menuInfo of availableMenus) {
      const menu = await processMenu(page, menuInfo)
      result.push(menu)
    }

    await browser.close()
    return result
  } catch (error) {
    await browser.close()
    throw error
  }
}
