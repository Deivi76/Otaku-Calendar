import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'otaku-calendar-crawler',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
