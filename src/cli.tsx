#!/usr/bin/env node
// src/cli.tsx
import { render } from 'ink';
import { loadToken } from './token';
import { App } from './App';

function main(): void {
  try {
    loadToken(Date.now());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error loading token';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }
  render(<App />, { exitOnCtrlC: false });
}

main();
