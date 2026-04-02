import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'otaku-calendar-web',
  eventKey: process.env.INNGEST_EVENT_KEY,
});