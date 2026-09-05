const test = require('node:test');
const assert = require('node:assert');
const bots = require('../js/bots.js');
const cities = require('../data/cities.js');
const countries = require('../data/countries.js');

test('createBotParticipants generates correct count of bots', () => {
  const list = bots.createBotParticipants(3, 'hard');
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list[0].difficulty, 'hard');
  assert.ok(list[0].name.length > 0);
  assert.strictEqual(list[0].isHuman, false);
});

test('generateBotRoundAnswers respects impossible categories', () => {
  const datasets = {
    city: cities,
    country: countries
  };

  const bot = { id: 'bot_test', name: 'ტესტ ბოტი' };
  const letterMeta = {
    letter: 'ღ',
    weight: 1,
    difficulty: 'hard',
    impossibleCategories: ['country'] // No sovereign country in Georgian begins with ღ
  };

  const answers = bots.generateBotRoundAnswers({
    bot,
    difficulty: 'hard',
    letter: 'ღ',
    categories: ['country', 'city'],
    datasets,
    letterMeta
  });

  assert.strictEqual(answers['country'].word, '');
  assert.strictEqual(answers['country'].isValid, false);
});

test('generateBotRoundAnswers picks valid words starting with letter', () => {
  const datasets = {
    city: cities,
    country: countries
  };

  const bot = { id: 'bot_test', name: 'ტესტ ბოტი' };
  const answers = bots.generateBotRoundAnswers({
    bot,
    difficulty: 'hard',
    letter: 'თ',
    categories: ['city', 'country'],
    datasets
  });

  if (answers['city'].word) {
    assert.strictEqual(answers['city'].word.charAt(0), 'თ');
  }
  if (answers['country'].word) {
    assert.strictEqual(answers['country'].word.charAt(0), 'თ');
  }
});
