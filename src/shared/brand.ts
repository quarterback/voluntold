// The product's name and how it describes itself, in one place. To rename,
// change it here, redraw the wordmark outlines (src/web/Wordmark.tsx) and the
// favicon, then rebuild. index.html reads these at build time (vite.config.ts).

export const BRAND = {
  name: 'ManyArms',
  domain: 'manyarms.app',
  tagline: 'Put your membership to work',
  description: 'Free membership and volunteer management software for organizations that depend on their people.',
  contact: 'hello@vloora.com',
} as const;
