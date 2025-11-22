import { Hono, Context, Next } from 'hono'

import { FetchMenuWorkflow } from './workflows/fetch-menu'
import { IntercomMenuDO } from './menu-do'
import { IntercomMenuMCP } from './agent'
import { getWeekRange, formatDate } from './helpers/date-utils'
import { HomePage } from './views/home'
import { NotFoundPage } from './views/not-found'

const app = new Hono<{
  Bindings: Cloudflare.Env
}>()

const ALLOWED_LOCATIONS = ['london', 'dublin', 'sf'] as const
type Location = (typeof ALLOWED_LOCATIONS)[number]

const requireApiKey = async (c: Context<{ Bindings: Cloudflare.Env }>, next: Next) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key')

  if (!c.env.API_KEY) {
    c.status(500)
    return c.json({ error: 'API_KEY not configured on server' })
  }

  if (!apiKey || apiKey !== c.env.API_KEY) {
    c.status(401)
    return c.json({ error: 'Unauthorized: Invalid or missing API key' })
  }

  await next()
}

const validateLocation = (location: string): location is Location => {
  return ALLOWED_LOCATIONS.includes(location.toLowerCase() as Location)
}

app.get('/', (c) => {
  return c.html(HomePage())
})

app.notFound((c) => {
  const accept = c.req.header('Accept') || ''
  if (accept.includes('text/html')) {
    c.status(404)
    return c.html(NotFoundPage())
  }
  return c.json({ error: 'Not Found' }, 404)
})

/*
 * Create a new workflow to fetch the menu
 * Requires API key in x-api-key header or api_key query param
 * Returns the workflow id
 */
app.get('/workflow', requireApiKey, async (c) => {
  const workflow = await c.env.FETCH_MENU_WORKFLOW.create()
  c.status(200)
  return c.json(workflow)
})

/*
 * Get the status of a workflow
 * Returns the workflow status
 */
app.get('/workflow/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const workflow = await c.env.FETCH_MENU_WORKFLOW.get(id)
    const status = await workflow.status()
    c.status(200)
    return c.json(status)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorObj = error as { remote?: boolean }

    if (errorMessage.includes('not_found') || errorObj.remote === true) {
      c.status(404)
      return c.json({ error: 'Workflow not found', id })
    }
    c.status(500)
    return c.json({ error: 'Error fetching workflow status' })
  }
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
  const location = c.req.param('location').toLowerCase()
  const date = c.req.param('date')
  const { meal } = c.req.query() as { meal?: 'breakfast' | 'lunch' }

  if (!validateLocation(location)) {
    c.status(400)
    return c.json({
      error: 'Invalid location',
      validLocations: ALLOWED_LOCATIONS,
    })
  }
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

  if (!results || results.length === 0) {
    c.status(404)
    return c.json({ error: 'No results found' })
  }

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
  const location = c.req.param('location').toLowerCase()

  if (!validateLocation(location)) {
    c.status(400)
    return c.json({
      error: 'Invalid location',
      validLocations: ALLOWED_LOCATIONS,
      usage: '/menu/search/london?q=vegan&startDate=2025-11-24&endDate=2025-11-28',
    })
  }

  try {
    const query = c.req.query('q') || ''
    let startDate = c.req.query('startDate')
    let endDate = c.req.query('endDate')
    const mealType = c.req.query('meal') as 'breakfast' | 'lunch' | undefined
    const dietaryLabel = c.req.query('dietary') || undefined

    const dateToQuery = startDate || formatDate(new Date()) // Use current date as default
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

    if (!items || items.length === 0) {
      c.status(404)
      return c.json({ error: 'No items found' })
    }

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
    if (!data) {
      c.status(404)
      return c.json({ error: 'Menu not found' })
    }
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

export default {
  scheduled(_event: ScheduledEvent, env: Cloudflare.Env, ctx: ExecutionContext) {
    console.log('Scheduled event triggered')
    const delayedProcessing = async () => {
      const workflow = await env.FETCH_MENU_WORKFLOW.create()
      const status = await workflow.status()
      console.log('Workflow status:', status)
    }
    ctx.waitUntil(delayedProcessing())
  },
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
}

export { FetchMenuWorkflow }
export { IntercomMenuDO, IntercomMenuMCP }
