import { startOfMonth, endOfMonth, eachWeekOfInterval, isSameMonth, format, getQuarter, getYear } from "date-fns";

/**
 * Calculates which work week of the month a date belongs to.
 * A work week is defined as Monday - Friday.
 * Returns a string like "Week 1", "Week 2", etc.
 */
export function getWorkWeekOfMonth(date: Date): string {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  // Get all Mondays in the month
  const weeks = eachWeekOfInterval({
    start: monthStart,
    end: monthEnd
  }, { weekStartsOn: 1 }); // Week starts on Monday

  const weekIndex = weeks.findIndex((monday, index) => {
    const nextMonday = weeks[index + 1] || monthEnd;
    return date >= monday && date < nextMonday;
  });

  return weekIndex !== -1 ? `Week ${weekIndex + 1}` : "Week 1";
}

/**
 * Gets the quarter label for a date.
 * Returns something like "Q1 2024"
 */
export function getQuarterLabel(date: Date): string {
  const quarter = getQuarter(date);
  const year = getYear(date);
  return `Q${quarter} ${year}`;
}
