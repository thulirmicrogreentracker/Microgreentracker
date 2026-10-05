import { format, addDays, differenceInCalendarDays, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

// Dates are stored either as a local calendar date ("2026-10-05") or a full ISO timestamp.
// new Date("2026-10-05") would read the former as UTC midnight (05:30 in India, the previous
// evening in the Americas); parseISO reads it as local midnight.
const toDate = (date: string | Date): Date => (typeof date === 'string' ? parseISO(date) : date);

// Today's local calendar date as "YYYY-MM-DD".
export const todayLocal = (): string => format(new Date(), 'yyyy-MM-dd');

export const formatDate = (date: string | Date): string => {
  return format(toDate(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  return format(toDate(date), 'MMM dd, yyyy HH:mm');
};

export const addDaysToDate = (date: string, days: number): string => {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
};

// Calendar days, not 24-hour periods: something due tomorrow morning is 1 day away even late tonight.
export const getDaysFromNow = (date: string): number => {
  return differenceInCalendarDays(toDate(date), new Date());
};

export const getDaysSince = (date: string): number => {
  return differenceInCalendarDays(new Date(), toDate(date));
};

export const isDateToday = (date: string): boolean => {
  return isToday(toDate(date));
};

export const isDateTomorrow = (date: string): boolean => {
  return isTomorrow(toDate(date));
};

export const isDatePast = (date: string): boolean => {
  return isPast(toDate(date));
};

export const getRelativeTimeString = (date: string): string => {
  const days = getDaysFromNow(date);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};
// "Day N" of a batch: calendar days from the sowing date (a local YYYY-MM-DD) to `date`.
export const getDayNumber = (sowingDate: string, date: string): number =>
  differenceInCalendarDays(new Date(date), parseISO(sowingDate));
