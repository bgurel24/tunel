// Ağırlık birimi — veritabanında her şey kg tutulur, gösterim ayara göre çevrilir.

import type { Units } from '@/lib/prefs';

const KG_PER_LB = 0.45359237;

/** kg → seçili birim */
export function toDisplay(kg: number, units: Units): number {
  const v = units === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(v * 10) / 10;
}

/** Kullanıcının girdiği değer → kg */
export function toKg(value: number, units: Units): number {
  return units === 'lb' ? value * KG_PER_LB : value;
}

/** "120 kg" / "265 lb" */
export function fmtWeight(kg: number, units: Units): string {
  return `${toDisplay(kg, units)} ${units}`;
}
