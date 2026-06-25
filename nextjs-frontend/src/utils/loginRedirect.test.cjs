/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.resolve(__dirname, '..');

test('login page routes admins to admin dashboard and users to GEO workspace', () => {
  const source = fs.readFileSync(path.join(srcRoot, 'app/login/page.tsx'), 'utf8');

  assert.match(source, /user\?\.role === 'admin' \? '\/admin' : '\/geo'/);
  assert.doesNotMatch(source, /router\.push\('\/geo'\)/);
});
