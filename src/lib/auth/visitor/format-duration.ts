export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек.`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} мин.`
  const hours = Math.ceil(minutes / 60)
  return `${hours} ч.`
}
