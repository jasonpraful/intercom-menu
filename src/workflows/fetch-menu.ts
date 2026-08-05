import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from 'cloudflare:workers'
import { fetchLondonMenu } from './lib/london'
import { getMenuWeekRange } from '../helpers/date-utils'

// Acquiring a browser can fail for reasons that clear on their own (rate limits, no
// capacity in a location), so give the fetch a few attempts.
const FETCH_RETRIES: WorkflowStepConfig = {
  retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export class FetchMenuWorkflow extends WorkflowEntrypoint<Cloudflare.Env, {}> {
  async run(_event: WorkflowEvent<{}>, step: WorkflowStep) {
    const london = await step.do('fetch-london-menu', FETCH_RETRIES, async () => {
      try {
        return await fetchLondonMenu(this.env)
      } catch (error) {
        console.error('Error fetching London menu:', describeError(error))
        throw error
      }
    })

    if (london) {
      await step.do('save-london-menu', async () => {
        try {
          const weekRange = getMenuWeekRange()
          console.log('Saving menu for week:', weekRange.weekKey, `(today is ${new Date().toISOString().split('T')[0]})`)

          const doId = this.env.INTERCOM_MENU.idFromName(weekRange.weekKey)
          const stub = this.env.INTERCOM_MENU.get(doId)

          // Use new setMenuWithDates method with date mapping
          await stub.setMenuWithDates(london, weekRange.startDate)
        } catch (error) {
          console.error('Error saving London menu:', describeError(error))
          throw new Error('Error saving London menu')
        }
      })
    }
  }
}
