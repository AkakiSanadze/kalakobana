const test = require('node:test');
const assert = require('node:assert');
const scoring = require('../js/scoring.js');

test('Scoring: Only one player answers validly -> 20 points', () => {
  const result = scoring.scoreRound({
    categories: ['city'],
    participants: [
      { id: 'player', isHuman: true, answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } } },
      { id: 'bot1', isHuman: false, answers: { city: { word: '', isValid: false, canonical: '' } } },
      { id: 'bot2', isHuman: false, answers: { city: { word: 'არასწორი', isValid: false, canonical: 'არასწორი' } } }
    ],
    applyEarlyBonus: false
  });

  assert.strictEqual(result.roundScores['player'].totalPoints, 20);
  assert.strictEqual(result.roundScores['bot1'].totalPoints, 0);
  assert.strictEqual(result.roundScores['bot2'].totalPoints, 0);
  assert.strictEqual(result.winnerId, 'player');
});

test('Scoring: Unique valid answers -> 10 points each', () => {
  const result = scoring.scoreRound({
    categories: ['city'],
    participants: [
      { id: 'p1', answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } } },
      { id: 'p2', answers: { city: { word: 'თელავი', isValid: true, canonical: 'თელავი' } } }
    ],
    applyEarlyBonus: false
  });

  assert.strictEqual(result.roundScores['p1'].totalPoints, 10);
  assert.strictEqual(result.roundScores['p2'].totalPoints, 10);
});

test('Scoring: Duplicate answers -> 5 points each', () => {
  const result = scoring.scoreRound({
    categories: ['city'],
    participants: [
      { id: 'p1', answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } } },
      { id: 'p2', answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } } }
    ],
    applyEarlyBonus: false
  });

  assert.strictEqual(result.roundScores['p1'].totalPoints, 5);
  assert.strictEqual(result.roundScores['p2'].totalPoints, 5);
});

test('Scoring: Alias equivalence awards 5 points for matching concept', () => {
  const result = scoring.scoreRound({
    categories: ['city'],
    participants: [
      { id: 'p1', answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } } },
      { id: 'p2', answers: { city: { word: 'ტფილისი', isValid: true, canonical: 'თბილისი' } } }
    ],
    applyEarlyBonus: false
  });

  assert.strictEqual(result.roundScores['p1'].totalPoints, 5);
  assert.strictEqual(result.roundScores['p2'].totalPoints, 5);
});

test('Scoring: Early finish bonus gives +5 points', () => {
  const result = scoring.scoreRound({
    categories: ['city', 'country'],
    participants: [
      {
        id: 'player',
        finishedEarly: true,
        answers: {
          city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' },
          country: { word: 'თურქეთი', isValid: true, canonical: 'თურქეთი' }
        }
      },
      {
        id: 'bot',
        finishedEarly: false,
        answers: {
          city: { word: 'თელავი', isValid: true, canonical: 'თელავი' },
          country: { word: 'თურქმენეთი', isValid: true, canonical: 'თურქმენეთი' }
        }
      }
    ],
    applyEarlyBonus: true
  });

  // Unique answers (10 + 10 = 20) + early bonus (5) = 25
  assert.strictEqual(result.roundScores['player'].categoryPoints, 20);
  assert.strictEqual(result.roundScores['player'].bonusPoints, 5);
  assert.strictEqual(result.roundScores['player'].totalPoints, 25);

  // Bot: 20
  assert.strictEqual(result.roundScores['bot'].totalPoints, 20);
});
