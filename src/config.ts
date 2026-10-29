// ID do cliente OAuth do Google ("Aplicativo da Web").
// Em uma cópia do projeto, defina VITE_GOOGLE_CLIENT_ID nas variáveis do
// repositório no GitHub (veja o guia em #instalar ou no README).
const ID_ORIGINAL = '968528116673-brvjc09j4vq4e9pgodr5uu6cc75dvqki.apps.googleusercontent.com';
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const usaIdOriginal = host === 'rsilvas007.github.io' || host === 'localhost' || host === '127.0.0.1';

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || (usaIdOriginal ? ID_ORIGINAL : '');

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];

export const REPO_URL: string = import.meta.env.VITE_REPO_URL || 'https://github.com/rsilvas007/agendas_pdf';
