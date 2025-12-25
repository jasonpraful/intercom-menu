import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { fetchLondonMenu } from './lib/london'
import { NonRetryableError } from 'cloudflare:workflows'
import { getMenuWeekRange } from '../helpers/date-utils'

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
        try {
          const weekRange = getMenuWeekRange()
          console.log('Saving menu for week:', weekRange.weekKey, `(today is ${new Date().toISOString().split('T')[0]})`)

          const doId = this.env.INTERCOM_MENU.idFromName(weekRange.weekKey)
          const stub = this.env.INTERCOM_MENU.get(doId)

          // Use new setMenuWithDates method with date mapping
          await stub.setMenuWithDates(london, weekRange.startDate)
        } catch (error) {
          console.error('Error saving London menu:', error)
          throw new Error('Error saving London menu')
        }
      })
    }
  }
}
