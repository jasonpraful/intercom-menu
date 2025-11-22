import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { getWeekRange, getCurrentWeekRange, formatDate } from './helpers/date-utils'

// Shared schema definitions
const LOCATION_SCHEMA = z.enum(['london', 'dublin', 'sf'])
const MEAL_TYPE_SCHEMA = z.enum(['breakfast', 'lunch'])
const DIETARY_LABEL_SCHEMA = z.enum(['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free'])

export class IntercomMenuMCP extends McpAgent<Env, Record<string, never>, {}> {
  server = new McpServer({
    name: 'Intercom London Menu',
    version: '2.0.0',
  })

  /**
   * Helper function to get DO stub for a location and date
   */
  private async getDOStub(location: string, date?: string) {
    const targetDate = date || formatDate(new Date())
    const weekRange = getWeekRange(targetDate)
    const weekKey = weekRange.weekKey.replace('london', location.toLowerCase())
    const id = this.env.INTERCOM_MENU.idFromName(weekKey)
    return this.env.INTERCOM_MENU.get(id)
  }

  /**
   * Helper to format error responses
   */
  private formatErrorResponse(message: string) {
    return {
      content: [
        {
          text: JSON.stringify({ error: message }),
          type: 'text' as const,
        },
      ],
    }
  }

  /**
   * Helper to format successful responses
   */
  private formatSuccessResponse(data: any) {
    return {
      content: [
        {
          text: JSON.stringify(data, null, 2),
          type: 'text' as const,
        },
      ],
    }
  }

  async init() {
    // Tool 1: Query menu by date
    this.server.registerTool(
      'query-menu-by-date',
      {
        inputSchema: z.object({
          location: LOCATION_SCHEMA.describe('Location to query'),
          date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
          mealType: MEAL_TYPE_SCHEMA.optional().describe('Meal type to filter by'),
        }),
        description:
          'Get menu for a specific date and location. Returns menu categories with all items including full nutrition and allergen details.',
      },
      async ({ location, date, mealType }) => {
        try {
          const stub = await this.getDOStub(location, date)
          const targetDate = date || formatDate(new Date())
          const results = await stub.getMenuByDate(targetDate, mealType)

          if (!results || results.length === 0) {
            return this.formatErrorResponse(`No menu data for ${location} on ${targetDate}. Please check back later.`)
          }

          return this.formatSuccessResponse(results)
        } catch (error) {
          console.error('Error in query-menu-by-date:', error)
          return this.formatErrorResponse(`No menu data available for ${location}. Please check back later.`)
        }
      },
    )

    // Tool 2: Search menu items
    this.server.registerTool(
      'search-menu-items',
      {
        inputSchema: z.object({
          location: LOCATION_SCHEMA.describe('Location to search'),
          query: z.string().optional().describe('Search term for item names'),
          startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (defaults to current week Monday)'),
          endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to current week Friday)'),
          mealType: MEAL_TYPE_SCHEMA.optional().describe('Filter by meal type'),
          dietaryLabel: z.string().optional().describe('Filter by dietary label (e.g., "Vegan", "Gluten-Free")'),
        }),
        description:
          'Search menu items with flexible filters. Returns items with full details including nutrition, allergens, and ingredients. Great for finding specific items or filtering by dietary requirements.',
      },
      async ({ location, query, startDate, endDate, mealType, dietaryLabel }) => {
        try {
          // Use current week if dates not provided
          let effectiveStartDate = startDate
          let effectiveEndDate = endDate

          if (!startDate || !endDate) {
            const currentWeek = getCurrentWeekRange()
            effectiveStartDate = startDate || currentWeek.startDate
            effectiveEndDate = endDate || currentWeek.endDate
          }

          const stub = await this.getDOStub(location, effectiveStartDate)
          const items = await stub.searchMenuItems(query || '', {
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
            mealType,
            dietaryLabel,
          })

          if (!items || items.length === 0) {
            const dateRange = `${effectiveStartDate} to ${effectiveEndDate}`
            return this.formatErrorResponse(
              `No menu items found for ${location} in the date range ${dateRange} with the specified filters.`,
            )
          }

          return this.formatSuccessResponse({
            location,
            dateRange: {
              start: effectiveStartDate,
              end: effectiveEndDate,
            },
            count: items.length,
            items,
          })
        } catch (error) {
          console.error('Error in search-menu-items:', error)
          return this.formatErrorResponse(`No menu data available for ${location}. Please check back later.`)
        }
      },
    )

    // Tool 3: Get week menu
    this.server.registerTool(
      'get-week-menu',
      {
        inputSchema: z.object({
          location: LOCATION_SCHEMA.describe('Location to get menu for'),
          weekStartDate: z.string().optional().describe('Monday date in YYYY-MM-DD format (defaults to current week)'),
        }),
        description:
          'Get complete week menu data for a location. Returns full menu structure with breakfast and lunch for Monday-Friday, including stored timestamp and all item details.',
      },
      async ({ location, weekStartDate }) => {
        try {
          const targetDate = weekStartDate || getCurrentWeekRange().startDate
          const stub = await this.getDOStub(location, targetDate)
          const data = await stub.getStoredData()

          if (!data) {
            return this.formatErrorResponse(`No menu data for week of ${targetDate} at ${location}. Please check back later.`)
          }

          return this.formatSuccessResponse(data)
        } catch (error) {
          console.error('Error in get-week-menu:', error)
          return this.formatErrorResponse(`No menu data available for ${location}. Please check back later.`)
        }
      },
    )

    // Tool 4: Find items by dietary label
    this.server.registerTool(
      'find-items-by-dietary-label',
      {
        inputSchema: z.object({
          location: LOCATION_SCHEMA.describe('Location to search'),
          dietaryLabel: DIETARY_LABEL_SCHEMA.describe('Dietary label to filter by'),
          mealType: MEAL_TYPE_SCHEMA.optional().describe('Filter by meal type'),
          date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
        }),
        description:
          'Quick filter for specific dietary requirements. Returns all items matching the dietary label with full nutrition and allergen information.',
      },
      async ({ location, dietaryLabel, mealType, date }) => {
        try {
          const targetDate = date || formatDate(new Date())
          const stub = await this.getDOStub(location, targetDate)

          // Search for the specific date only
          const items = await stub.searchMenuItems('', {
            startDate: targetDate,
            endDate: targetDate,
            mealType,
            dietaryLabel,
          })

          if (!items || items.length === 0) {
            const mealFilter = mealType ? ` for ${mealType}` : ''
            return this.formatErrorResponse(`No ${dietaryLabel} items found for ${location} on ${targetDate}${mealFilter}.`)
          }

          return this.formatSuccessResponse({
            location,
            date: targetDate,
            dietaryLabel,
            mealType: mealType || 'all',
            count: items.length,
            items,
          })
        } catch (error) {
          console.error('Error in find-items-by-dietary-label:', error)
          return this.formatErrorResponse(`No menu data available for ${location}. Please check back later.`)
        }
      },
    )
  }
}
