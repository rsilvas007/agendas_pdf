export interface ParsedEvent {
  id: string;
  selected: boolean;
  title: string;
  date: string; // AAAA-MM-DD
  endDate: string; // AAAA-MM-DD para períodos de vários dias, '' se for um dia só
  startTime: string; // HH:mm ou ''
  endTime: string; // HH:mm ou ''
  isAllDay: boolean;
  location: string;
  originalLine: string;
  matchedDate?: string;
  matchedTime?: string;
}

export interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
  color?: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // dia de início, no fuso escolhido
  endDate: string; // último dia (inclusivo)
  startTime: string; // '' quando é dia inteiro
  endTime: string;
  link: string;
  fromPdf: boolean;
}

export interface SendResult {
  created: Array<{ id: string; eventId: string; title: string; date: string; link: string }>;
  skipped: Array<{ id: string; title: string; date: string }>;
  failed: Array<{ id: string; title: string; message: string }>;
}
