#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['tsc', '--noEmit'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
