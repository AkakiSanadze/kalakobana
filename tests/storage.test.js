const test = require('node:test');
const assert = require('node:assert');
const storage = require('../js/storage.js');

test('Storage: getSettings and saveSettings', () => {
  const initial = storage.getSettings();
  assert.ok(initial.roundDuration > 0);
  assert.ok(initial.activeCategories.length >= 3);

  storage.saveSettings({ ...initial, roundDuration: 120 });
  const updated = storage.getSettings();
  assert.strictEqual(updated.roundDuration, 120);

  // Restore
  storage.saveSettings(initial);
});

test('Storage: Custom dictionary add, remove, export, import', () => {
  storage.clearCustomDictionary();
  assert.strictEqual(storage.getCustomDictionary().length, 0);

  const added = storage.addCustomWord('city', 'ახალი ქალაქი', 'ა');
  assert.strictEqual(added, true);
  assert.strictEqual(storage.getCustomDictionary().length, 1);

  // Prevent duplicate
  const dup = storage.addCustomWord('city', 'ახალი ქალაქი', 'ა');
  assert.strictEqual(dup, false);

  const exported = storage.exportCustomDictionary();
  assert.ok(exported.includes('ახალი ქალაქი'));

  storage.clearCustomDictionary();
  assert.strictEqual(storage.getCustomDictionary().length, 0);

  const impResult = storage.importCustomDictionary(exported);
  assert.strictEqual(impResult.success, true);
  assert.strictEqual(impResult.count, 1);
  assert.strictEqual(storage.getCustomDictionary().length, 1);

  const wordId = storage.getCustomDictionary()[0].id;
  storage.removeCustomWord(wordId);
  assert.strictEqual(storage.getCustomDictionary().length, 0);
});

test('Storage: Stats update and reset', () => {
  storage.resetStats();
  const initial = storage.getStats();
  assert.strictEqual(initial.gamesPlayed, 0);

  storage.updateStats({
    gameWon: true,
    roundsPlayed: 3,
    roundsWon: 2,
    gameScore: 75,
    roundScores: [
      { letter: 'თ', score: 30, words: ['თბილისი', 'თურქეთი'] },
      { letter: 'ბ', score: 25, words: ['ბათუმი'] },
      { letter: 'გ', score: 20, words: ['გორი'] }
    ]
  });

  const updated = storage.getStats();
  assert.strictEqual(updated.gamesPlayed, 1);
  assert.strictEqual(updated.gamesWon, 1);
  assert.strictEqual(updated.roundsPlayed, 3);
  assert.strictEqual(updated.roundsWon, 2);
  assert.strictEqual(updated.totalPoints, 75);
  assert.strictEqual(updated.highestGameScore, 75);
  assert.strictEqual(updated.highestRoundScore, 30);
  assert.strictEqual(updated.letterStats['თ'].played, 1);
  assert.strictEqual(updated.wordsCount, 4);

  storage.resetStats();
  assert.strictEqual(storage.getStats().gamesPlayed, 0);
});
