(function(root, factory) {
  const bots = factory(root.KALAKOBANA_CONFIG, root.KALAKOBANA_VALIDATOR);
  if (typeof module === 'object' && module.exports) {
    module.exports = bots;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_BOTS = bots;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(config, validator) {
  'use strict';

  const defaultProfiles = config ? config.BOT_PROFILES : [
    { id: 'bot_giorgi', name: 'გიორგი', avatar: '👨‍💼', color: '#3b82f6' },
    { id: 'bot_nino', name: 'ნინო', avatar: '👩‍🔬', color: '#ec4899' },
    { id: 'bot_dato', name: 'დათო', avatar: '👨‍🎨', color: '#10b981' }
  ];

  const difficultyParams = config ? config.BOT_DIFFICULTY_PARAMS : {
    easy: { fillRateMin: 0.60, fillRateMax: 0.75, popularityWeight: { 5: 0.50, 4: 0.35, 3: 0.12, 2: 0.03, 1: 0.00 }, errorChance: 0.08 },
    medium: { fillRateMin: 0.80, fillRateMax: 0.90, popularityWeight: { 5: 0.35, 4: 0.35, 3: 0.20, 2: 0.08, 1: 0.02 }, errorChance: 0.02 },
    hard: { fillRateMin: 0.95, fillRateMax: 0.99, popularityWeight: { 5: 0.20, 4: 0.25, 3: 0.25, 2: 0.20, 1: 0.10 }, errorChance: 0.00 }
  };

  /**
   * Filter words from database matching category and starting with letter.
   */
  function getCandidateWords(datasets, categoryId, letter) {
    if (!datasets || !datasets[categoryId] || !Array.isArray(datasets[categoryId].words)) {
      return [];
    }

    const normLetter = validator ? validator.normalizeGeorgian(letter) : letter.toLowerCase();
    const allWords = datasets[categoryId].words;

    return allWords.filter(item => {
      if (!item || !item.w) return false;
      const first = validator ? validator.getFirstLetter(item.w) : item.w.charAt(0).toLowerCase();
      return first === normLetter;
    });
  }

  /**
   * Pick a word from candidates according to popularity bias.
   */
  function pickWordByPopularity(candidates, weights) {
    if (!candidates || candidates.length === 0) return null;

    // Group candidates by popularity (1-5)
    const byPop = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const c of candidates) {
      const pop = Math.min(5, Math.max(1, c.popularity || 3));
      byPop[pop].push(c);
    }

    // Determine target popularity bucket using weights
    const roll = Math.random();
    let accumulated = 0;
    let chosenPop = 5;

    for (let p = 5; p >= 1; p--) {
      accumulated += (weights[p] || 0.2);
      if (roll <= accumulated && byPop[p].length > 0) {
        chosenPop = p;
        break;
      }
    }

    // If chosen bucket has words, pick random word from it
    if (byPop[chosenPop].length > 0) {
      const idx = Math.floor(Math.random() * byPop[chosenPop].length);
      return byPop[chosenPop][idx];
    }

    // Fallback: pick any random candidate
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  /**
   * Generate bot answers for a round.
   *
   * @param {Object} params
   * @param {Object} params.bot - bot profile { id, name, avatar, color }
   * @param {string} params.difficulty - 'easy' | 'medium' | 'hard'
   * @param {string} params.letter - current round letter
   * @param {string[]} params.categories - array of active category IDs
   * @param {Object} params.datasets - KALAKOBANA_DATA dictionary
   * @param {Object} [params.letterMeta] - metadata from letters.js (impossibleCategories, difficulty)
   * @returns {Object} answers map: { [catId]: { word, isValid, canonical, answerDelayMs } }
   */
  function generateBotRoundAnswers({
    bot,
    difficulty = 'medium',
    letter,
    categories,
    datasets,
    letterMeta = null
  }) {
    const params = difficultyParams[difficulty] || difficultyParams.medium;
    const answers = {};
    const usedWordsInRound = new Set();

    const fillRate = params.fillRateMin + Math.random() * (params.fillRateMax - params.fillRateMin);

    // Letter difficulty penalty
    const letterWeight = (letterMeta && typeof letterMeta.weight === 'number') ? letterMeta.weight : 2;
    const rarityPenalty = letterWeight <= 1 ? 0.20 : 0.0;
    const effectiveFillRate = Math.max(0.3, fillRate - rarityPenalty);

    const impossibleList = (letterMeta && Array.isArray(letterMeta.impossibleCategories))
      ? letterMeta.impossibleCategories
      : [];

    for (const catId of categories) {
      // If impossible category for this letter (e.g. countries on ღ, ძ, ჭ)
      if (impossibleList.includes(catId)) {
        answers[catId] = {
          word: '',
          isValid: false,
          canonical: '',
          note: 'შეუძლებელი კომბინაცია'
        };
        continue;
      }

      // Roll whether bot answers this category
      if (Math.random() > effectiveFillRate) {
        answers[catId] = {
          word: '',
          isValid: false,
          canonical: ''
        };
        continue;
      }

      // Find candidate words
      const candidates = getCandidateWords(datasets, catId, letter);
      if (candidates.length === 0) {
        answers[catId] = {
          word: '',
          isValid: false,
          canonical: ''
        };
        continue;
      }

      // Filter out words already used by this bot in this round
      const available = candidates.filter(c => {
        const norm = validator ? validator.normalizeGeorgian(c.w) : c.w.toLowerCase();
        return !usedWordsInRound.has(norm);
      });

      const pool = available.length > 0 ? available : candidates;
      const chosen = pickWordByPopularity(pool, params.popularityWeight);

      if (!chosen) {
        answers[catId] = { word: '', isValid: false, canonical: '' };
        continue;
      }

      const norm = validator ? validator.normalizeGeorgian(chosen.w) : chosen.w.toLowerCase();
      usedWordsInRound.add(norm);

      // Check simulated error
      const willError = Math.random() < params.errorChance;
      if (willError) {
        // Corrupt the word with a typo or slight letter swap
        const corrupted = chosen.w.slice(0, -1) + 'ს';
        answers[catId] = {
          word: corrupted,
          isValid: false,
          canonical: corrupted,
          note: 'შეცდომა / ტიპო'
        };
      } else {
        answers[catId] = {
          word: chosen.w,
          isValid: true,
          canonical: norm,
          note: chosen.note || ''
        };
      }
    }

    return answers;
  }

  /**
   * Instantiate bot participants for a game.
   */
  function createBotParticipants(count = 2, difficulty = 'medium') {
    const selectedProfiles = defaultProfiles.slice(0, Math.min(count, defaultProfiles.length));
    return selectedProfiles.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      bio: p.bio,
      difficulty: difficulty,
      isHuman: false,
      answers: {},
      finishedEarly: false
    }));
  }

  return {
    generateBotRoundAnswers,
    createBotParticipants,
    getCandidateWords
  };
});
