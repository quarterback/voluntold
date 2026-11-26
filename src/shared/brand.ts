// The product's name and how it describes itself, in one place. "Volley" is a
// working name: change it here and in the wordmark when the real name is set,
// then rebuild. index.html reads these at build time (vite.config.ts).

export const BRAND = {
  name: 'Volley',
  tagline: 'Put your membership to work',
  description: 'Free membership and volunteer management software for organizations that depend on their people.',
  contact: 'hello@vloora.com',
} as const;
