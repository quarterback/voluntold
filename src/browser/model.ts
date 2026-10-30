// Stands in for src/worker/model.ts in the browser demo. The demo has no model
// key, so text, Word and PDF imports explain that and suggest CSV or Excel,
// as the server does when no model is set up. Keeps the SDK out of the page.

import { fail } from '../worker/util';

export type ExtractedRows = { columns: string[]; rows: string[][]; notes: string };

export function modelConfigured(): boolean {
  return false;
}

export async function extractRows(): Promise<ExtractedRows> {
  fail(503, 'This file type needs a model, and none is set up. Import a CSV or Excel file instead.');
}
