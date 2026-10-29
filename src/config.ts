// ID do cliente OAuth do Google. Para usar outro, defina VITE_GOOGLE_CLIENT_ID
// (no arquivo .env ou nas variáveis do repositório no GitHub).
export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '968528116673-brvjc09j4vq4e9pgodr5uu6cc75dvqki.apps.googleusercontent.com';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];

export const REPO_URL = 'https://github.com/rsilvas007/agendas_pdf';
