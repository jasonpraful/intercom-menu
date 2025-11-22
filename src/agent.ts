import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { getMondayAndFriday } from './helpers/get-weekday'

export class IntercomMenuMCP extends McpAgent<Env, Record<string, never>, {}> {
  server = new McpServer({
    name: 'Intercom London Menu',
    version: '1.0.0',
  })

  async init() {
    this.server.registerTool(
      'get-current-week-menu',
      {
        inputSchema: z.object({ location: z.enum(['london', 'dublin']) }),
        description: "Get the current week's menu for the given location",
      },
      async ({ location }) => {
        const mondayAndFriday = await getMondayAndFriday()
        const doName = `${location.toLowerCase()}-${mondayAndFriday.monday}-${mondayAndFriday.friday}`
        const id = this.env.INTERCOM_MENU.idFromName(doName)
        const stub = this.env.INTERCOM_MENU.get(id)
        const menu = await stub.getAllMenus()
        return { content: [{ text: JSON.stringify(menu), type: 'text' }] }
      },
    )

    this.server.registerTool(
      'get-menu-by-date',
      {
        inputSchema: z.object({
          location: z.enum(['london', 'dublin']),
          startDate: z.coerce.date(),
          endDate: z.coerce.date(),
        }),
        description:
          'Get the menu for the given location and date range. Please ensure the start and end dates are for MONDAY and FRIDAY of the same week. Example: 2025-11-17 and 2025-11-21 where 2025-11-17 is Monday and 2025-11-21 is Friday.',
        title: 'Get Menu by Date',
      },
      async ({ location, startDate, endDate }) => {
        const doName = `${location.toLowerCase()}-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`
        const id = this.env.INTERCOM_MENU.idFromName(doName)
        const stub = this.env.INTERCOM_MENU.get(id)
        const menu = await stub.getAllMenus()
        console.log('menu', menu, doName)
        return { content: [{ text: JSON.stringify(menu), type: 'text' }] }
      },
    )
  }
}
