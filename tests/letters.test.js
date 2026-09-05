const test = require('node:test');
const assert = require('node:assert');
const letters = require('../data/letters.js');

test('Georgian alphabet covers all 33 letters', () => {
  assert.strictEqual(letters.length, 33, 'Alphabet should have 33 letters');

  const expectedLetters = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';
  const actualLetters = letters.map(l => l.letter).join('');
  assert.strictEqual(actualLetters, expectedLetters);
});

test('All letters have positive weights and valid difficulties', () => {
  const validDifficulties = new Set(['easy', 'medium', 'hard']);

  for (const item of letters) {
    assert.ok(item.weight >= 1 && item.weight <= 10, `Letter ${item.letter} has invalid weight ${item.weight}`);
    assert.ok(validDifficulties.has(item.difficulty), `Letter ${item.letter} has invalid difficulty ${item.difficulty}`);
    assert.ok(Array.isArray(item.impossibleCategories), `Letter ${item.letter} must have impossibleCategories array`);
  }
});

test('Known impossible combinations are accurately documented', () => {
  const gha = letters.find(l => l.letter === 'ღ');
  assert.ok(gha.impossibleCategories.includes('country'), 'ღ should not have sovereign countries');

  const dza = letters.find(l => l.letter === 'ძ');
  assert.ok(dza.impossibleCategories.includes('country'), 'ძ should not have sovereign countries');

  const chra = letters.find(l => l.letter === 'ჭ');
  assert.ok(chra.impossibleCategories.includes('country'), 'ჭ should not have sovereign countries');
});
