import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('dashboard exposes loading, error, and empty states', () => {
  assert.match(page, /aria-busy=\{loading\}/);
  assert.match(page, /role="alert"/);
  assert.match(page, /No activity yet/);
  assert.match(page, /OverviewSkeleton/);
});

test('navigation and focus state remain explicit', () => {
  assert.match(page, /aria-current=/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:44px/);
});

test('privacy-safe language is present in primary dashboard states', () => {
  assert.match(page, /content hidden/);
  assert.match(page, /Personal details are never shown/);
  assert.match(page, /Private by design/);
});

test('responsive and reduced-motion fallbacks are defined', () => {
  assert.match(css, /max-width:760px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
