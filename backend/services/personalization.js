const { ENERGY_AREA_LABELS } = require('../prompts/index');

// Keywords that map each energy area to matching meeting title patterns
const AREA_KEYWORDS = {
  performance:     ['performance', 'feedback', 'review', 'eval', '360', 'perf'],
  product_review:  ['product', 'technical', 'review', 'spec', 'design review', 'architecture', 'tech review'],
  presentations:   ['presentation', 'demo', 'present', 'all-hands', 'town hall', 'pitch', 'showcase'],
  cross_team:      ['cross-team', 'cross team', 'alignment', 'sync', 'xfn', 'cross-functional', 'stakeholder'],
  one_on_ones:     ['1:1', '1-1', 'one on one', '1 on 1', 'check-in', 'catch up'],
  customer_facing: ['customer', 'client', 'user', 'external', 'partner', 'sales', 'demo'],
};

/**
 * Check whether a meeting title matches a given energy area
 */
function matchesArea(titleLower, area) {
  const kws = AREA_KEYWORDS[area] || [];
  return kws.some(kw => titleLower.includes(kw));
}

/**
 * Return the first matching energy area key for a meeting title, or null
 */
function getMatchedArea(event, userPrefs) {
  const energyAreas = JSON.parse(userPrefs?.energy_areas || '[]');
  const titleLower = (event.title || '').toLowerCase();
  return energyAreas.find(area => matchesArea(titleLower, area)) || null;
}

/**
 * Calculate how many consecutive hours of meetings the user has been in
 * immediately before this event starts (gaps of <= 15 min count as continuous)
 */
function getConsecutiveHours(event, todayEvents) {
  const eventStart = new Date(event.start_time).getTime();
  const GAP_TOLERANCE_MS = 15 * 60 * 1000;

  // All events that ended at or before this event's start
  const prior = todayEvents
    .filter(e => e.id !== event.id && new Date(e.end_time).getTime() <= eventStart)
    .sort((a, b) => new Date(b.end_time) - new Date(a.end_time)); // most recent first

  let blockStart = eventStart;

  for (const prev of prior) {
    const prevEnd = new Date(prev.end_time).getTime();
    const prevStart = new Date(prev.start_time).getTime();

    if (blockStart - prevEnd <= GAP_TOLERANCE_MS) {
      // This event is contiguous — extend the block back
      blockStart = prevStart;
    } else {
      break; // Gap is too large — stop
    }
  }

  return (eventStart - blockStart) / (1000 * 60 * 60); // Convert ms → hours
}

/**
 * Get the average energy value from a list of check-ins
 */
function getAverageEnergy(checkins) {
  if (!checkins.length) return 3; // Default to "Steady" if no data
  const sum = checkins.reduce((acc, c) => acc + c.value, 0);
  return sum / checkins.length;
}

/**
 * Decide whether a given event should receive a nudge
 * Based on the user's frequency preference + meeting type + energy patterns
 */
function shouldNudge(event, userPrefs, todayEvents, energyCheckins) {
  const frequency = userPrefs?.frequency || 'medium';
  const energyAreas = JSON.parse(userPrefs?.energy_areas || '[]');
  const keywords = (userPrefs?.meeting_keywords || '')
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  const titleLower = (event.title || '').toLowerCase();

  const isHighWeight =
    energyAreas.some(area => matchesArea(titleLower, area)) ||
    keywords.some(kw => titleLower.includes(kw));

  const consecutiveHours = getConsecutiveHours(event, todayEvents);

  switch (frequency) {
    case 'low':
      return isHighWeight;

    case 'medium':
      return isHighWeight || consecutiveHours >= 2;

    case 'high':
      return true;

    case 'surprise': {
      const density = todayEvents.length;
      const avgEnergy = getAverageEnergy(energyCheckins);
      if (density >= 6 || avgEnergy <= 2.5) return true;
      if (isHighWeight) return true;
      return Math.random() < 0.4;
    }

    default:
      return isHighWeight;
  }
}

/**
 * Count how many events have already ended relative to now
 */
function countCompletedEvents(todayEvents) {
  const now = Date.now();
  return todayEvents.filter(e => new Date(e.end_time).getTime() < now).length;
}

module.exports = {
  matchesArea,
  getMatchedArea,
  getConsecutiveHours,
  getAverageEnergy,
  shouldNudge,
  countCompletedEvents,
};
