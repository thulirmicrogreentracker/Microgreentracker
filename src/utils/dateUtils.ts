import { format, addDays, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

export const addDaysToDate = (date: string, days: number): string => {
  return addDays(new Date(date), days).toISOString().split('T')[0];
};

export const getDaysFromNow = (date: string): number => {
  return differenceInDays(new Date(date), new Date());
};

export const getDaysSince = (date: string): number => {
  return differenceInDays(new Date(), new Date(date));
};

export const isDateToday = (date: string): boolean => {
  return isToday(new Date(date));
};

export const isDateTomorrow = (date: string): boolean => {
  return isTomorrow(new Date(date));
};

export const isDatePast = (date: string): boolean => {
  return isPast(new Date(date));
};

export const getRelativeTimeString = (date: string): string => {
  const days = getDaysFromNow(date);
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};