import { Hono } from 'hono'

import { FetchMenuWorkflow } from './workflows/fetch-menu'
import { IntercomMenuDO } from './menu-do'
import { IntercomMenuMCP } from './agent'
import { getWeekRange } from './helpers/date-utils'

const app = new Hono<{
  Bindings: Cloudflare.Env
}>()

/*
 * Create a new workflow to fetch the menu
 * Returns the workflow id
 */
app.get('/workflow', async (c) => {
  const id = await c.env.FETCH_MENU_WORKFLOW.create()
  c.status(200)
  return c.text(`Workflow created with id ${id}`)
})

/*
 * Get the status of a workflow
 * Returns the workflow status
 */
app.get('/workflow/:id', async (c) => {
  const id = c.req.param('id')
  const workflow = await c.env.FETCH_MENU_WORKFLOW.get(id)
  const status = await workflow.status()
  c.status(200)
  return c.json(status)
})

// DO - Menu Endpoints

app.get('/menu', async (c) => {
  c.status(400)
  c.header('Content-Type', 'application/json')
  return c.json({
    error: 'Menu durable object name is required',
    examples: {
      directAccess: '/menu/london-2025-11-24-2025-11-28',
      queryByDate: '/menu/query/london/2025-11-25?meal=lunch',
      search: '/menu/search/london?q=vegan&dietary=Vegan',
    },
  })
})

/*
 * Get the menu for a given location and date
 * Sample usage:
 * /menu/query/london/2025-11-25?meal=lunch
 */
app.get('/menu/query/:location/:date', async (c) => {
  const location = c.req.param('location')
  const date = c.req.param('date')
  const { meal } = c.req.query() as { meal?: 'breakfast' | 'lunch' }
  if (meal && meal !== 'breakfast' && meal !== 'lunch') {
    c.status(400)
    c.header('Content-Type', 'application/json')
    return c.json({
      error: 'Invalid meal type',
      validMealTypes: ['breakfast', 'lunch'],
    })
  }
  const weekRange = getWeekRange(date)
  const id = c.env.INTERCOM_MENU.idFromName(weekRange.weekKey.replace('london', location))
  const stub = c.env.INTERCOM_MENU.get(id)
  const results = await stub.getMenuByDate(date, meal)

  c.status(200)
  return c.json(results)
})

/*
 * Search the menu for a given location
 * Sample usage:
 * /menu/search/london?q=vegan&startDate=2025-11-24&endDate=2025-11-28
 * /menu/search/london?dietary=Vegan&startDate=2025-11-24&endDate=2025-11-28
 * /menu/search/london?meal=breakfast&startDate=2025-11-24&endDate=2025-11-28
 * /menu/search/london?meal=lunch&startDate=2025-11-24&endDate=2025-11-28
 */
app.get('/menu/search/:location', async (c) => {
  const location = c.req.param('location')

  if (!location) {
    c.status(400)
    return c.json({
      error: 'Location required',
      usage: '/menu/search/london?q=vegan&startDate=2025-11-24&endDate=2025-11-28',
    })
  }

  try {
    const query = c.req.query('q') || ''
    let startDate = c.req.query('startDate')
    let endDate = c.req.query('endDate')
    const mealType = c.req.query('meal') as 'breakfast' | 'lunch' | undefined
    const dietaryLabel = c.req.query('dietary') || undefined

    const dateToQuery = startDate || '2025-11-25' // Use a date we know has data
    const weekRange = getWeekRange(dateToQuery)
    const id = c.env.INTERCOM_MENU.idFromName(weekRange.weekKey.replace('london', location))
    const stub = c.env.INTERCOM_MENU.get(id)

    // If no dates provided, use the stored week's date range
    if (!startDate || !endDate) {
      const storedRange = await stub.getStoredWeekRange()
      if (storedRange) {
        startDate = startDate || storedRange.startDate
        endDate = endDate || storedRange.endDate
      }
    }

    const items = await stub.searchMenuItems(query, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      mealType,
      dietaryLabel,
    })

    c.status(200)
    return c.json({ items, count: items.length })
  } catch (error) {
    console.error('Error searching menu:', error)
    c.status(500)
    return c.json({ error: 'Error searching menu' })
  }
})

/*
 * Get the menu for a given name
 * Sample usage:
 * /menu/london-2025-11-24-2025-11-28
 */
app.get('/menu/:name', async (c) => {
  const name = c.req.param('name')

  try {
    const id = c.env.INTERCOM_MENU.idFromName(name)
    const stub = c.env.INTERCOM_MENU.get(id)
    const data = await stub.getStoredData()
    c.status(200)
    return c.json(data)
  } catch (error) {
    console.error('Error getting menu:', error)
    c.status(500)
    return c.json({ error: 'Error getting menu' })
  }
})

// MCP endpoints
app.mount('/sse', IntercomMenuMCP.serveSSE('/sse').fetch, { replaceRequest: false })
app.mount('/mcp', IntercomMenuMCP.serve('/mcp').fetch, { replaceRequest: false })

export default app

export { FetchMenuWorkflow }
export { IntercomMenuDO, IntercomMenuMCP }
