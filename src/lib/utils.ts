import { type ClassValue, clsx } from "clsx";
import { DateTime, type WeekdayNumbers } from "luxon";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// format as GBP
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// format number as 1st, 2nd, 3rd, etc.
export function formatOrdinal(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = num % 100;
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
}

// use luxon to get month name from month number
export function getMonthName(month: number): string {
  return DateTime.fromObject({ month }).toFormat("LLLL");
}

export function getWeekdayName(weekday: WeekdayNumbers): string {
  return DateTime.local().set({ weekday }).toFormat("cccc");
}
