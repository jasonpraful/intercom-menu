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

function getMenuType(menuName: string): 'breakfast' | 'lunch' | 'dinner' {
  const name = menuName.toLowerCase()
  if (name.includes('breakfast')) return 'breakfast'
  if (name.includes('dinner')) return 'dinner'
  return 'lunch'
}

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

async function extractMenuStructure(page: Page, menuIdentifier: string): Promise<DayMenu[]> {
  const allDays = await page.evaluate((labelMap: Record<string, string>, identifier: string) => {
    function mapLabels(labelIds: string): string[] {
      if (!labelIds || labelIds.trim() === '') return []
      return labelIds
        .split(',')
        .map((id) => labelMap[id.trim()])
        .filter(Boolean)
    }

    const allDayElements = document.querySelectorAll('.k10-course.k10-course_level_1')
    const dayElements = Array.from(allDayElements).filter((el) => {
      const parent = el.closest('[data-menu-identifier]')
      return parent?.getAttribute('data-menu-identifier') === identifier
    })

    const days: DayMenu[] = []

    for (const dayEl of dayElements) {
      const dayName = dayEl.querySelector('.k10-course__name')?.textContent?.trim()
      if (!dayName) continue

      const categories: MenuCategory[] = []
      const categoryElements = dayEl.querySelectorAll('.k10-course.k10-course_level_2')

      categoryElements.forEach((catEl) => {
        const categoryName = catEl.querySelector('.k10-course__name')?.textContent?.trim()
        if (!categoryName) return

        const items: MenuItem[] = []
        const itemElements = catEl.querySelectorAll('.k10-recipe.k10-recipe_menu-item')

        itemElements.forEach((itemEl) => {
          const modal = itemEl.querySelector('.k10-recipe-modal')
          items.push({
            id: modal?.getAttribute('data-recipe-id') || '',
            name: itemEl.querySelector('.k10-recipe__name')?.textContent?.trim() || '',
            dietaryLabels: mapLabels(itemEl.getAttribute('data-labels') || ''),
          })
        })

        if (items.length > 0) {
          categories.push({ name: categoryName, items })
        }
      })

      if (categories.length > 0) {
        days.push({ day: dayName, categories })
      }
    }

    return days
  }, DIETARY_LABEL_MAP, menuIdentifier)

  // Deduplicate days by name (HTML may have duplicate sections)
  const seenDays = new Set<string>()
  return allDays.filter((day) => {
    if (seenDays.has(day.day)) return false
    seenDays.add(day.day)
    return true
  })
}

async function processMenu(page: Page, menuInfo: MenuInfo, menuUrl: string): Promise<Menu> {
  console.log(`Processing menu: ${menuInfo.name}`)

  // Navigate fresh for each menu to ensure clean state
  await page.goto(menuUrl, { waitUntil: 'networkidle0' })

  // Click to select this specific menu
  await page.evaluate((identifier) => {
    const menuOption = document.querySelector(`.k10-menu-selector__options-li[data-menu-identifier="${identifier}"]`)
    if (menuOption) {
      (menuOption as HTMLElement).click()
    }
  }, menuInfo.identifier)

  // Wait for the menu content to load - the site uses AJAX to load menu content
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Extract menu structure (filtered by menu identifier, already deduplicated)
  const days = await extractMenuStructure(page, menuInfo.identifier)

  // Build lookup of all items by ID for name resolution and later enrichment
  const allItems = days.flatMap((day) => day.categories.flatMap((cat) => cat.items))
  const itemById = new Map(allItems.filter((item) => item.id).map((item) => [item.id, item]))
  const uniqueItemIds = [...itemById.keys()]

  console.log(`Found ${uniqueItemIds.length} unique items in ${menuInfo.name}`)

  // Extract details for each unique item ID
  const itemDetailsById = new Map<string, ModalDetails>()

  for (const itemId of uniqueItemIds) {
    const itemName = itemById.get(itemId)?.name || ''
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

  // Enrich items with their details
  for (const item of allItems) {
    const details = item.id ? itemDetailsById.get(item.id) : undefined
    if (details) {
      item.ingredients = details.ingredients
      item.allergens = details.allergens
      item.nutritionPer100g = details.nutritionPer100g
    }
  }

  const menuType = getMenuType(menuInfo.name)

  return {
    identifier: menuInfo.identifier,
    name: menuInfo.name,
    type: menuType,
    days,
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
      const menu = await processMenu(page, menuInfo, env.LONDON_MENU_URL)
      result.push(menu)
    }

    await browser.close()
    return result
  } catch (error) {
    await browser.close()
    throw error
  }
}
