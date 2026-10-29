import type { ParsedEvent } from '../types';

export const MONTHS_PT: Record<string, number>;
export const SAMPLE_TEXT: string;
export function pad2(n: number): string;
export function isValidDate(y: number, m: number, d: number): boolean;
export function resolveYear(month: number, day: number, ref?: Date): number;
export function toMinutes(hm: string): number;
export function addOneHour(hm: string): string;
export function safeEnd(start: string, end: string): string;
export function eventEnd(date: string, endDate: string, start: string, end: string): { date: string; time: string };
export function nextDay(date: string): string;
export function findHighlights(line: string, ref?: Date): Array<{ start: number; end: number; kind: 'date' | 'time' }>;
export function parseEvents(text: string, ref?: Date): ParsedEvent[];
