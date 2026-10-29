export interface ParsedEvent {
  id: string;
  selected: boolean;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm or ''
  endTime: string; // HH:mm or ''
  isAllDay: boolean;
  location: string;
  originalLine: string;
  matchedDateString?: string;
  matchedTimeString?: string;
  error?: string;
}

export interface ParseResult {
  rawText: string;
  lines: string[];
  events: ParsedEvent[];
}
