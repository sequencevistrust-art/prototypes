/**
 * Format a duration in seconds to a human-readable string
 * Dynamically adjusts the display based on the duration:
 * - Seconds for < 60s
 * - Minutes + seconds for < 60m
 * - Hours + minutes for < 24h
 * - Days + hours for >= 24h
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds * 10) / 10}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${Math.round(seconds % 60)}s`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
