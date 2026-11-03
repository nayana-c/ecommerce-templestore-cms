/** Formatting + slug helpers for the CMS. */
import type { Money } from './api/client.js';

/** Format minor-unit money (assumes a 2-decimal currency such as INR). */
export function formatMoney(money: Money, locale = 'en-IN'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currency }).format(
      money.amountMinor / 100,
    );
  } catch {
    return `${(money.amountMinor / 100).toFixed(2)} ${money.currency}`;
  }
}

/** Major-unit string/number -> integer minor units. */
export function toMinor(major: string | number): number {
  const n = typeof major === 'string' ? Number(major) : major;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Integer minor units -> major-unit number for editing. */
export function toMajor(minor: number): number {
  return minor / 100;
}

/** Derive a URL-safe slug from a free-text name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
