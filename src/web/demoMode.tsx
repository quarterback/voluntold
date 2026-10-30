// The browser demo build (src/browser/main.ts) runs the server in the page.
// These are the few places the app behaves differently there: no sign-in, the
// sample picker as the first screen, and a way to start over.

import { Button, type ButtonProps } from '@mui/material';
import { useDialogs } from './pages/common';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const BROWSER_DEMO = (import.meta as any).env?.VITE_BROWSER_DEMO === '1';

/** Waits for the in-page server before the app renders. Resolves false to skip rendering. */
export const demoReady: Promise<boolean> = BROWSER_DEMO ? (window as any).volleyDemoReady : Promise.resolve(true);

export function StartOverButton(props: ButtonProps) {
  const dialogs = useDialogs();
  async function startOver() {
    const ok = await dialogs.confirm({
      title: 'Undo all your changes?',
      confirm: 'Start over',
      destructive: true,
    });
    if (ok) await (window as any).volleyDemo.reset();
  }
  return <Button onClick={startOver} {...props}>Start over</Button>;
}
