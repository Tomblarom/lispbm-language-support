#!/usr/bin/env node

const { spawn } = require('child_process');
const { mkdirSync } = require('fs');
const path = require('path');

const packageJson = require('../package.json');

const distDir = path.resolve(__dirname, '..', 'dist');
mkdirSync(distDir, { recursive: true });

const vsixName = `lispbm-language-support-${packageJson.version}.vsix`;
const vsixPath = path.join(distDir, vsixName);

const child = spawn('vsce', ['package', '--out', vsixPath], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true,
});

child.stdin.write('y\n');
child.stdin.end();

child.on('close', (code) => {
  process.exit(code ?? 0);
});
