const ical = require('node-ical');

/**
 * Parse an .ics file buffer and return a flat array of events
 * for the next 7 days (including today).
 *
 * Handles: single events, recurring events (RRULE expansion),
 * attendees, and timezone conversion.
 *
 * @param {Buffer} fileBuffer - The raw .ics file contents
 * @returns {Array} Array of { title, description, location, start_time, end_time, attendees }
 */
function parseCalendar(fileBuffer) {
  const icsString = fileBuffer.toString('utf-8');
  const parsed = ical.sync.parseICS(icsString);

  const now = new Date();
  const windowStart = startOfDay(now);
  const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = [];

  for (const key of Object.keys(parsed)) {
    const component = parsed[key];

    // We only care about VEVENT components
    if (component.type !== 'VEVENT') continue;

    if (component.rrule) {
      // --- Recurring event: expand RRULE for the next 7 days ---
      try {
        const occurrences = component.rrule.between(windowStart, windowEnd, true);

        for (const occurrenceStart of occurrences) {
          const duration = component.end
            ? component.end.getTime() - component.start.getTime()
            : 60 * 60 * 1000; // Default to 1 hour if no end time

          const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

          events.push(buildEvent(component, occurrenceStart, occurrenceEnd));
        }
      } catch (err) {
        console.warn('[calendarParser] Could not expand RRULE for event:', component.summary, err.message);
      }
    } else {
      // --- Single event ---
      const start = toDate(component.start);
      const end = toDate(component.end || component.start);

      if (!start) continue;

      // Only include events within our 7-day window
      if (start < windowEnd && end > windowStart) {
        events.push(buildEvent(component, start, end));
      }
    }
  }

  // Sort by start time
  events.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return events;
}

/**
 * Build a clean event object from a parsed VEVENT component
 */
function buildEvent(component, start, end) {
  const attendees = extractAttendees(component.attendee);

  return {
    title: component.summary ? String(component.summary).trim() : 'Untitled Event',
    description: component.description ? String(component.description).trim() : null,
    location: component.location ? String(component.location).trim() : null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    attendees: JSON.stringify(attendees),
  };
}

/**
 * Extract attendee email addresses from the ATTENDEE field
 * The field can be a single object or an array
 */
function extractAttendees(attendeeField) {
  if (!attendeeField) return [];

  const attendees = Array.isArray(attendeeField) ? attendeeField : [attendeeField];

  return attendees.map(a => {
    // node-ical parses ATTENDEE as an object with a .val property containing "mailto:email"
    if (typeof a === 'object' && a.val) {
      return a.val.replace(/^mailto:/i, '').toLowerCase();
    }
    if (typeof a === 'string') {
      return a.replace(/^mailto:/i, '').toLowerCase();
    }
    return null;
  }).filter(Boolean);
}

/**
 * Safely convert various date formats to a JS Date
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return null;
}

/**
 * Get midnight (start of day) for a given date
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = { parseCalendar };
