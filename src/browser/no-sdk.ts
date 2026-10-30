// The browser demo never calls a model (see model.ts here), so the SDK that
// src/worker/tags.ts imports is replaced with this to keep it out of the page.

export default class Anthropic {
  constructor() {
    throw new Error('No model in the browser demo');
  }
}

export function zodOutputFormat(): never {
  throw new Error('No model in the browser demo');
}
