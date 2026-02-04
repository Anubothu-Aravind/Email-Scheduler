/**
 * Get the current hour window key for rate limiting
 * Format: YYYY-MM-DD-HH
 */
export const getCurrentHourWindow = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
};

/**
 * Get the next hour window key
 */
export const getNextHourWindow = (): string => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
};

/**
 * Get timestamp for the start of next hour
 */
export const getNextHourTimestamp = (): Date => {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  return now;
};

/**
 * Calculate delay until next hour in milliseconds
 */
export const getDelayUntilNextHour = (): number => {
  const now = new Date();
  const nextHour = getNextHourTimestamp();
  return nextHour.getTime() - now.getTime();
};

/**
 * Check if a scheduled time is in the past
 */
export const isPastScheduledTime = (scheduledAt: Date): boolean => {
  return new Date(scheduledAt) < new Date();
};

/**
 * Get delay in milliseconds from now to scheduled time
 */
export const getDelayFromNow = (scheduledAt: Date): number => {
  const delay = new Date(scheduledAt).getTime() - Date.now();
  return Math.max(0, delay);
};
