// Reads rows out of text, Word and PDF imports with a model. CSV, Excel,
// XML and JSON are read in the browser and never reach this file.
//
// The file's text includes names and contact details, so the provider must
// not train on prompts or keep them. Record the provider and the date its
// terms were checked in a decision record before any real file goes through
// (docs/SPEC.md, "Model for imports").

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Env } from './env';
import { fail } from './util';

const MAX_TEXT = 400_000;

const Rows = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  notes: z.string(),
});

export type ExtractedRows = z.infer<typeof Rows>;

export function modelConfigured(env: Env): boolean {
  return env.MODEL_PROVIDER === 'anthropic' && !!env.MODEL_API_KEY;
}

export async function extractRows(env: Env, fileName: string, text: string): Promise<ExtractedRows> {
  if (!modelConfigured(env)) {
    fail(503, 'Reading this kind of file needs a model, and none is set up. Save the list as CSV or Excel and import that.');
  }
  if (text.length > MAX_TEXT) fail(400, 'That file is too long to read in one go. Split it into smaller files.');

  const client = new Anthropic({ apiKey: env.MODEL_API_KEY });
  const response = await client.messages.parse({
    model: env.MODEL_NAME || 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(Rows) },
    system:
      'You turn a list of people from a document into a table. Each person is one row. ' +
      'Use the column names the document uses, or plain ones such as Name, Email, Phone. ' +
      'Copy values exactly as written. Leave a cell empty when the document does not say. ' +
      'Never invent people or values. Put anything you were unsure about in notes.',
    messages: [{ role: 'user', content: `File name: ${fileName}\n\n<document>\n${text}\n</document>` }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    fail(503, 'The file could not be read. Save the list as CSV or Excel and import that.');
  }
  const out = response.parsed_output;
  return { columns: out.columns, rows: out.rows.map((r) => out.columns.map((_, i) => r[i] ?? '')), notes: out.notes };
}
