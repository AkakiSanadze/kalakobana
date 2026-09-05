const test = require('node:test');
const assert = require('node:assert');

const config = require('../js/config.js');
const letters = require('../data/letters.js');
const storage = require('../js/storage.js');
const validator = require('../js/validator.js');
const scoring = require('../js/scoring.js');
const bots = require('../js/bots.js');
const audio = require('../js/audio.js');

// Mock data setup for validator
const cities = require('../data/cities.js');
const countries = require('../data/countries.js');
validator.initIndex({ city: cities, country: countries });

// Load GameEngine
const gameModule = require('../js/game.js');
const GameEngine = gameModule.GameEngine;

test('GameEngine: Letter picking and non-repetition', () => {
  const engine = new GameEngine();
  const pickedLetters = new Set();

  for (let i = 0; i < 33; i++) {
    const item = engine.pickNextLetter(letters);
    assert.ok(item && item.letter);
    assert.ok(!pickedLetters.has(item.letter), `Letter ${item.letter} was picked more than once before full cycle`);
    pickedLetters.add(item.letter);
  }

  assert.strictEqual(pickedLetters.size, 33);
});

test('GameEngine: State transitions and round flow', () => {
  const engine = new GameEngine();
  assert.strictEqual(engine.state, 'IDLE');

  let stateChanges = [];
  engine.onStateChange = (st) => stateChanges.push(st);

  engine.startNewGame({
    roundDuration: 10,
    totalRounds: 2,
    validationMode: 'strict',
    activeCategories: ['city', 'country'],
    botCount: 2
  });

  assert.strictEqual(engine.currentRound, 1);
  assert.strictEqual(engine.state, 'COUNTDOWN');
  assert.strictEqual(engine.participants.length, 3); // 1 human + 2 bots

  engine.beginActiveRound();
  assert.strictEqual(engine.state, 'ROUND_ACTIVE');
  assert.ok(engine.currentLetter.length === 1);

  // Player enters inputs
  engine.setPlayerInput('city', 'თბილისი');
  engine.setPlayerInput('country', 'თურქეთი');

  // Finish round early
  engine.playerFinishEarly();
  assert.strictEqual(engine.state, 'ROUND_RESULTS');
  assert.strictEqual(engine.roundHistory.length, 1);

  // Proceed to round 2
  engine.proceedFromResults();
  assert.strictEqual(engine.currentRound, 2);
  assert.strictEqual(engine.state, 'COUNTDOWN');

  engine.beginActiveRound();
  engine.setPlayerInput('city', 'ბათუმი');
  engine.finishRound();

  assert.strictEqual(engine.state, 'ROUND_RESULTS');
  assert.strictEqual(engine.roundHistory.length, 2);

  // Proceed from round 2 (total 2 rounds) -> GAME_OVER
  engine.proceedFromResults();
  assert.strictEqual(engine.state, 'GAME_OVER');
});

test('GameEngine: Solo mode (botCount: 0) runs with 1 participant and completes successfully', () => {
  const engine = new GameEngine();
  engine.startNewGame({
    roundDuration: 10,
    totalRounds: 1,
    botCount: 0,
    activeCategories: ['city']
  });

  assert.strictEqual(engine.participants.length, 1);
  assert.strictEqual(engine.participants[0].isHuman, true);

  engine.beginActiveRound();
  engine.currentLetter = 'თ';
  engine.currentLetterMeta = { letter: 'თ', weight: 5, difficulty: 'easy', impossibleCategories: [] };
  engine.setPlayerInput('city', 'თბილისი');
  engine.finishRound();

  assert.strictEqual(engine.state, 'ROUND_RESULTS');
  assert.strictEqual(engine.roundHistory.length, 1);
  assert.strictEqual(engine.cumulativeScores['player'], 10);

  engine.proceedFromResults();
  assert.strictEqual(engine.state, 'GAME_OVER');
});

