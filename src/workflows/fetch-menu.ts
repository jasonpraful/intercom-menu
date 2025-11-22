import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { fetchLondonMenu } from './lib/london'
import { NonRetryableError } from 'cloudflare:workflows'
import { getNextWeekRange } from '../helpers/date-utils'

export class FetchMenuWorkflow extends WorkflowEntrypoint<Cloudflare.Env, {}> {
  async run(_event: WorkflowEvent<{}>, step: WorkflowStep) {
    const london = await step.do('fetch-london-menu', async () => {
      try {
        return await fetchLondonMenu(this.env)
      } catch (error) {
        console.error('Error fetching London menu:', error)
        throw new NonRetryableError('Error fetching London menu')
      }
    })

    if (london) {
      await step.do('save-london-menu', async () => {
        // This code will always run on a Sunday at 1pm UK time
        // So we need to get the upcoming Monday and Friday
        try {
          const weekRange = getNextWeekRange()
          console.log('Saving menu for week:', weekRange.weekKey)

          const doId = this.env.INTERCOM_MENU.idFromName(weekRange.weekKey)
          const stub = this.env.INTERCOM_MENU.get(doId)

          // Use new setMenuWithDates method with date mapping
          await stub.setMenuWithDates(london, weekRange.startDate)
        } catch (error) {
          console.error('Error saving London menu:', error)
          throw new NonRetryableError('Error saving London menu')
        }
      })
    }
  }
}
