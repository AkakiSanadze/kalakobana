(function(root, factory) {
  const scoring = factory(root.KALAKOBANA_CONFIG, root.KALAKOBANA_VALIDATOR);
  if (typeof module === 'object' && module.exports) {
    module.exports = scoring;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_SCORING = scoring;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(config, validator) {
  'use strict';

  const RULES = config ? config.SCORING_RULES : {
    ONLY_ONE: 20,
    UNIQUE: 10,
    DUPLICATE: 5,
    INVALID: 0,
    EARLY_FINISH_BONUS: 5
  };

  /**
   * Score a single round across all participants.
   *
   * @param {Object} params
   * @param {string[]} params.categories - list of active category IDs
   * @param {Object[]} params.participants - array of participants:
   *   [ { id: 'player', name: 'მე', isHuman: true, answers: { city: { word: 'თბილისი', isValid: true, canonical: 'თბილისი' } }, finishedEarly: true }, ... ]
   * @param {boolean} [params.applyEarlyBonus=true]
   * @returns {Object} {
   *   categoryResults: { [catId]: { [participantId]: { word, isValid, points, reason, isDuplicateWith: [] } } },
   *   roundScores: { [participantId]: { totalPoints, categoryPoints, bonusPoints } },
   *   winnerId: string | null
   * }
   */
  function scoreRound({ categories, participants, applyEarlyBonus = true }) {
    const categoryResults = {};
    const roundScores = {};

    // Initialize round scores
    for (const p of participants) {
      roundScores[p.id] = {
        participantId: p.id,
        name: p.name,
        isHuman: Boolean(p.isHuman),
        totalPoints: 0,
        categoryPoints: 0,
        bonusPoints: 0
      };
    }

    // Process each category
    for (const catId of categories) {
      categoryResults[catId] = {};

      // Collect valid answers for this category
      // Map: canonicalWordKey -> array of participantIds
      const canonicalMap = new Map();
      const validParticipants = [];

      for (const p of participants) {
        const ans = (p.answers && p.answers[catId]) || { word: '', isValid: false };
        const rawWord = ans.word ? ans.word.trim() : '';
        const isValid = Boolean(ans.isValid && rawWord);
        const canon = ans.canonical || (validator ? validator.normalizeGeorgian(rawWord) : rawWord.toLowerCase());

        categoryResults[catId][p.id] = {
          word: rawWord,
          isValid: isValid,
          canonical: canon,
          points: 0,
          reason: 'invalid', // 'only_one' | 'unique' | 'duplicate' | 'invalid'
          matchesWith: []
        };

        if (isValid) {
          validParticipants.push(p.id);
          if (!canonicalMap.has(canon)) {
            canonicalMap.set(canon, []);
          }
          canonicalMap.get(canon).push(p.id);
        }
      }

      // If only one participant had a valid answer in this category
      if (validParticipants.length === 1) {
        const loneWinnerId = validParticipants[0];
        categoryResults[catId][loneWinnerId].points = RULES.ONLY_ONE;
        categoryResults[catId][loneWinnerId].reason = 'only_one';
        roundScores[loneWinnerId].categoryPoints += RULES.ONLY_ONE;
        roundScores[loneWinnerId].totalPoints += RULES.ONLY_ONE;
      } else if (validParticipants.length > 1) {
        // Multiple valid answers
        for (const [canon, pIds] of canonicalMap.entries()) {
          if (pIds.length === 1) {
            // Unique word among participants
            const pId = pIds[0];
            categoryResults[catId][pId].points = RULES.UNIQUE;
            categoryResults[catId][pId].reason = 'unique';
            roundScores[pId].categoryPoints += RULES.UNIQUE;
            roundScores[pId].totalPoints += RULES.UNIQUE;
          } else {
            // Duplicate word among participants
            for (const pId of pIds) {
              const others = pIds.filter(id => id !== pId);
              categoryResults[catId][pId].points = RULES.DUPLICATE;
              categoryResults[catId][pId].reason = 'duplicate';
              categoryResults[catId][pId].matchesWith = others;
              roundScores[pId].categoryPoints += RULES.DUPLICATE;
              roundScores[pId].totalPoints += RULES.DUPLICATE;
            }
          }
        }
      }
    }

    // Early finish bonus
    if (applyEarlyBonus) {
      // Find participants who finished early and have at least 50% valid answers
      for (const p of participants) {
        if (p.finishedEarly) {
          let validCount = 0;
          for (const catId of categories) {
            if (categoryResults[catId][p.id] && categoryResults[catId][p.id].isValid) {
              validCount++;
            }
          }
          // Only reward if they actually played decently (>= 50% valid answers)
          if (validCount >= Math.ceil(categories.length / 2)) {
            roundScores[p.id].bonusPoints += RULES.EARLY_FINISH_BONUS;
            roundScores[p.id].totalPoints += RULES.EARLY_FINISH_BONUS;
          }
        }
      }
    }

    // Determine round winner
    let maxScore = -1;
    let winnerId = null;
    let isTie = false;

    for (const p of participants) {
      const s = roundScores[p.id].totalPoints;
      if (s > maxScore) {
        maxScore = s;
        winnerId = p.id;
        isTie = false;
      } else if (s === maxScore && maxScore > 0) {
        isTie = true;
      }
    }

    return {
      categoryResults,
      roundScores,
      winnerId: isTie ? null : winnerId,
      maxScore
    };
  }

  return {
    RULES,
    scoreRound
  };
});
