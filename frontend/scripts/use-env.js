#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envName = process.argv[2];
if (!envName) {
  console.error('Usage: node scripts/use-env.js <env>');
  console.error('  <env> must be one of: staging');
  process.exit(1);
}

const root = process.cwd();
const src = path.join(root, `.env.${envName}`);
const dest = path.join(root, '.env.production');

if (!fs.existsSync(src)) {
  console.error(`Missing env file: ${src}`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`Copied ${path.basename(src)} -> .env.production`);