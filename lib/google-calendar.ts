import { google } from 'googleapis'

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  // Private keys in .env have literal \n — restore real newlines
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) return null

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

export async function createCalendarEvent({
  calendarId,
  summary,
  description,
  startAt,
  endAt,
}: {
  calendarId: string
  summary: string
  description?: string
  startAt: string
  endAt: string
}): Promise<string | null> {
  const calendar = getClient()
  if (!calendar) return null
  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: startAt },
        end: { dateTime: endAt },
      },
    })
    return res.data.id ?? null
  } catch (err) {
    console.error('[gcal] createEvent error', err)
    return null
  }
}

export async function updateCalendarEvent({
  calendarId,
  eventId,
  summary,
  startAt,
  endAt,
}: {
  calendarId: string
  eventId: string
  summary: string
  startAt: string
  endAt: string
}): Promise<void> {
  const calendar = getClient()
  if (!calendar) return
  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { summary, start: { dateTime: startAt }, end: { dateTime: endAt } },
    })
  } catch (err) {
    console.error('[gcal] updateEvent error', err)
  }
}

export async function deleteCalendarEvent({
  calendarId,
  eventId,
}: {
  calendarId: string
  eventId: string
}): Promise<void> {
  const calendar = getClient()
  if (!calendar) return
  try {
    await calendar.events.delete({ calendarId, eventId })
  } catch (err) {
    console.error('[gcal] deleteEvent error', err)
  }
}
