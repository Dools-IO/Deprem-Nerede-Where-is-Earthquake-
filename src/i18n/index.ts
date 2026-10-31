import type { Locale } from './config';
import tr, { type Dictionary } from './dictionaries/tr';
import en from './dictionaries/en';

export type { Dictionary };
export * from './config';

export const DICTIONARIES: Record<Locale, Dictionary> = { tr, en };

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale];
