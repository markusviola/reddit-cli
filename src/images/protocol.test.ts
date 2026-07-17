import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectImageProtocol, isGraphicsProtocol } from './protocol';

test('detects kitty via KITTY_WINDOW_ID', () => {
  assert.equal(detectImageProtocol({ KITTY_WINDOW_ID: '1' }), 'kitty');
});

test('detects kitty via TERM', () => {
  assert.equal(detectImageProtocol({ TERM: 'xterm-kitty' }), 'kitty');
});

test('detects iterm via TERM_PROGRAM', () => {
  assert.equal(detectImageProtocol({ TERM_PROGRAM: 'iTerm.app' }), 'iterm');
});

test('detects iterm-compatible output for WezTerm', () => {
  assert.equal(detectImageProtocol({ TERM_PROGRAM: 'WezTerm' }), 'iterm');
});

test('detects sixels for mintty', () => {
  assert.equal(detectImageProtocol({ TERM_PROGRAM: 'mintty' }), 'sixels');
});

test('falls back to symbols for an unknown terminal', () => {
  assert.equal(detectImageProtocol({ TERM: 'xterm-256color' }), 'symbols');
});

test('only symbols is a non-graphics protocol', () => {
  assert.equal(isGraphicsProtocol('symbols'), false);
  assert.equal(isGraphicsProtocol('kitty'), true);
  assert.equal(isGraphicsProtocol('iterm'), true);
  assert.equal(isGraphicsProtocol('sixels'), true);
});
