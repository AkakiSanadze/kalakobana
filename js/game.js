(function(root, factory) {
  const game = factory(
    root.KALAKOBANA_CONFIG,
    root.KALAKOBANA_LETTERS,
    root.KALAKOBANA_STORAGE,
    root.KALAKOBANA_VALIDATOR,
    root.KALAKOBANA_SCORING,
    root.KALAKOBANA_BOTS,
    root.KALAKOBANA_AUDIO
  );
  if (typeof module === 'object' && module.exports) {
    module.exports = game;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_GAME = game;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(
  config,
  lettersData,
  storage,
  validator,
  scoring,
  bots,
  audio
) {
  'use strict';

  const STATES = {
    IDLE: 'IDLE',
    COUNTDOWN: 'COUNTDOWN',
    ROUND_ACTIVE: 'ROUND_ACTIVE',
    ROUND_REVIEW: 'ROUND_REVIEW',
    ROUND_RESULTS: 'ROUND_RESULTS',
    GAME_OVER: 'GAME_OVER'
  };

  class GameEngine {
    constructor() {
      this.state = STATES.IDLE;
      this.settings = storage ? storage.getSettings() : (config ? config.DEFAULT_SETTINGS : {});
      this.currentRound = 0;
      this.currentLetter = '';
      this.currentLetterMeta = null;
      this.usedLetters = new Set();

      this.participants = [];
      this.roundHistory = []; // [ { roundNumber, letter, categoryResults, roundScores, winnerId } ]
      this.cumulativeScores = {}; // { [participantId]: totalScore }

      this.timerId = null;
      this.timeRemainingSec = 0;
      this.totalRoundDurationSec = 90;
      this.timerEndTime = 0;

      this.playerAnswers = {}; // { [catId]: rawString }
      this.pendingReviewItems = []; // items needing self-confirmation

      this.onStateChange = null;
      this.onTimerTick = null;
      this.onBotStatus = null;
    }

    /**
     * Pick a letter using weights from letters.js, excluding used letters.
     */
    pickNextLetter(lettersList = (lettersData || [])) {
      if (!Array.isArray(lettersList) || lettersList.length === 0) {
        return { letter: 'ა', weight: 5, difficulty: 'easy', impossibleCategories: [] };
      }

      // Candidate letters not yet used
      let candidates = lettersList.filter(l => !this.usedLetters.has(l.letter));
      if (candidates.length === 0) {
        // All letters have been used in this game; reset used set
        this.usedLetters.clear();
        candidates = [...lettersList];
      }

      // Calculate total weight
      const totalWeight = candidates.reduce((sum, item) => sum + (item.weight || 1), 0);
      let randomVal = Math.random() * totalWeight;

      for (const item of candidates) {
        randomVal -= (item.weight || 1);
        if (randomVal <= 0) {
          this.usedLetters.add(item.letter);
          return item;
        }
      }

      // Fallback
      const picked = candidates[0];
      this.usedLetters.add(picked.letter);
      return picked;
    }

    /**
     * Start a new game session.
     */
    startNewGame(customSettings = null) {
      if (customSettings) {
        this.settings = { ...this.settings, ...customSettings };
        if (storage) storage.saveSettings(this.settings);
      }

      this.currentRound = 0;
      this.usedLetters.clear();
      this.roundHistory = [];
      this.cumulativeScores = {};

      // Setup participants
      const human = {
        id: 'player',
        name: 'შენ',
        avatar: '👤',
        color: '#4f46e5',
        isHuman: true,
        answers: {},
        finishedEarly: false
      };

      const botParticipants = bots
        ? bots.createBotParticipants(this.settings.botCount, this.settings.botDifficulty)
        : [];

      this.participants = [human, ...botParticipants];
      for (const p of this.participants) {
        this.cumulativeScores[p.id] = 0;
      }

      this.startNextRound();
    }

    /**
     * Start the next round: pick letter, set timers, transition to COUNTDOWN -> ROUND_ACTIVE.
     */
    startNextRound() {
      this.stopTimer();
      this.currentRound += 1;
      this.currentLetterMeta = this.pickNextLetter();
      this.currentLetter = this.currentLetterMeta.letter;

      // Reset answers
      this.playerAnswers = {};
      for (const p of this.participants) {
        p.answers = {};
        p.finishedEarly = false;
      }

      this.totalRoundDurationSec = this.settings.roundDuration || 90;
      this.timeRemainingSec = this.totalRoundDurationSec;

      this.transitionState(STATES.COUNTDOWN);

      if (audio && typeof audio.playTone === 'function') {
        audio.playTone(523.25, 'triangle', 0.2, 0.1);
      }
    }

    /**
     * Begin active round after countdown completes.
     */
    beginActiveRound() {
      this.transitionState(STATES.ROUND_ACTIVE);

      if (this.totalRoundDurationSec > 0) {
        this.timerEndTime = Date.now() + this.totalRoundDurationSec * 1000;
        this.startTimer();
      } else {
        this.timeRemainingSec = 0;
      }
    }

    startTimer() {
      this.stopTimer();
      let lastSecond = Math.ceil((this.timerEndTime - Date.now()) / 1000);

      this.timerId = setInterval(() => {
        const remainingMs = Math.max(0, this.timerEndTime - Date.now());
        const remainingSec = Math.ceil(remainingMs / 1000);

        this.timeRemainingSec = remainingSec;

        if (this.onTimerTick) {
          this.onTimerTick(this.timeRemainingSec, this.totalRoundDurationSec);
        }

        // Sound cues for last 5 seconds
        if (remainingSec !== lastSecond) {
          lastSecond = remainingSec;
          if (remainingSec <= 5 && remainingSec > 0) {
            if (audio) audio.playTick(true);
          }
        }

        if (remainingMs <= 0) {
          this.stopTimer();
          this.onTimeExpired();
        }
      }, 250);
    }

    stopTimer() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    /**
     * Called when the player inputs text into a category field.
     */
    setPlayerInput(categoryId, text) {
      this.playerAnswers[categoryId] = text;
    }

    /**
     * Player manually finishes round before time runs out.
     */
    playerFinishEarly() {
      if (this.state !== STATES.ROUND_ACTIVE) return;
      this.stopTimer();
      const human = this.participants.find(p => p.isHuman);
      if (human) {
        human.finishedEarly = true;
      }
      if (audio) audio.playClick();
      this.finishRound();
    }

    /**
     * Timer expired.
     */
    onTimeExpired() {
      if (this.state !== STATES.ROUND_ACTIVE) return;
      if (audio) audio.playTimeUp();
      this.finishRound();
    }

    /**
     * Conclude the active round, validate player inputs, handle self-confirmation if needed.
     */
    finishRound() {
      this.stopTimer();

      const categories = this.settings.activeCategories;
      const human = this.participants.find(p => p.isHuman);
      const otherInputs = categories.map(cid => this.playerAnswers[cid] || '');

      const validatedHumanAnswers = {};
      const pendingUnknowns = [];

      for (const catId of categories) {
        const rawWord = (this.playerAnswers[catId] || '').trim();
        const otherWords = categories
          .filter(cid => cid !== catId)
          .map(cid => this.playerAnswers[cid] || '')
          .filter(Boolean);

        const valResult = validator.validateInput({
          category: catId,
          word: rawWord,
          letter: this.currentLetter,
          otherInputs: otherWords,
          mode: this.settings.validationMode
        });

        if (valResult.status === 'valid') {
          validatedHumanAnswers[catId] = {
            word: rawWord,
            isValid: true,
            canonical: (valResult.entry && valResult.entry.canonicalNorm) || validator.normalizeGeorgian(rawWord)
          };
        } else if (valResult.status === 'unknown') {
          // Self-confirmation needed
          pendingUnknowns.push({
            categoryId: catId,
            word: rawWord,
            letter: this.currentLetter,
            message: valResult.message
          });
          validatedHumanAnswers[catId] = {
            word: rawWord,
            isValid: false, // will be resolved in review
            canonical: validator.normalizeGeorgian(rawWord)
          };
        } else {
          // invalid, empty, wrong letter, duplicate
          validatedHumanAnswers[catId] = {
            word: rawWord,
            isValid: false,
            canonical: validator.normalizeGeorgian(rawWord)
          };
        }
      }

      if (human) {
        human.answers = validatedHumanAnswers;
      }

      if (pendingUnknowns.length > 0 && this.settings.validationMode === 'self') {
        this.pendingReviewItems = pendingUnknowns;
        this.transitionState(STATES.ROUND_REVIEW);
      } else {
        this.finalizeScoring();
      }
    }

    /**
     * In self-confirmation mode: player approved or rejected unknown words.
     * decisions: [ { categoryId, word, approved: boolean, addToDict: boolean } ]
     */
    resolveReviewDecisions(decisions) {
      const human = this.participants.find(p => p.isHuman);
      if (human) {
        for (const dec of decisions) {
          if (dec.approved && human.answers[dec.categoryId]) {
            human.answers[dec.categoryId].isValid = true;
            if (dec.addToDict && storage) {
              storage.addCustomWord(dec.categoryId, dec.word, this.currentLetter);
              if (validator) {
                validator.addEntryToIndex(dec.categoryId, {
                  w: dec.word,
                  popularity: 5,
                  note: 'მომხმარებლის სიტყვა',
                  aliases: []
                }, true);
              }
            }
          }
        }
      }

      this.pendingReviewItems = [];
      this.finalizeScoring();
    }

    /**
     * Compute bot answers, score round, and display results.
     */
    finalizeScoring() {
      const datasets = (typeof window !== 'undefined' && window.KALAKOBANA_DATA)
        ? window.KALAKOBANA_DATA
        : (typeof globalThis !== 'undefined' && globalThis.KALAKOBANA_DATA ? globalThis.KALAKOBANA_DATA : {});

      // Generate bot answers
      for (const p of this.participants) {
        if (!p.isHuman) {
          p.answers = bots.generateBotRoundAnswers({
            bot: p,
            difficulty: this.settings.botDifficulty,
            letter: this.currentLetter,
            categories: this.settings.activeCategories,
            datasets: datasets,
            letterMeta: this.currentLetterMeta
          });
        }
      }

      // Calculate round score
      const result = scoring.scoreRound({
        categories: this.settings.activeCategories,
        participants: this.participants,
        applyEarlyBonus: this.settings.earlyFinishBonus
      });

      // Update cumulative scores
      for (const p of this.participants) {
        const roundPts = result.roundScores[p.id].totalPoints;
        this.cumulativeScores[p.id] = (this.cumulativeScores[p.id] || 0) + roundPts;
      }

      const roundRecord = {
        roundNumber: this.currentRound,
        letter: this.currentLetter,
        categoryResults: result.categoryResults,
        roundScores: result.roundScores,
        winnerId: result.winnerId,
        cumulativeScores: { ...this.cumulativeScores }
      };

      this.roundHistory.push(roundRecord);

      // Save active session
      if (storage) {
        storage.saveActiveRound({
          state: STATES.ROUND_RESULTS,
          round: this.currentRound,
          history: this.roundHistory,
          cumulativeScores: this.cumulativeScores
        });
      }

      this.transitionState(STATES.ROUND_RESULTS);

      if (audio) {
        audio.playReveal();
      }
    }

    /**
     * Proceed to next round or end game.
     */
    proceedFromResults() {
      const maxRounds = this.settings.totalRounds || 0;
      if (maxRounds > 0 && this.currentRound >= maxRounds) {
        this.endGame();
      } else {
        this.startNextRound();
      }
    }

    /**
     * Conclude the game, save stats, show game over screen.
     */
    endGame() {
      this.stopTimer();

      // Determine overall winner
      let highestScore = -1;
      let winner = null;
      for (const p of this.participants) {
        const score = this.cumulativeScores[p.id] || 0;
        if (score > highestScore) {
          highestScore = score;
          winner = p;
        }
      }

      const human = this.participants.find(p => p.isHuman);
      const isHumanWinner = winner && winner.isHuman;

      // Update persistent stats
      if (storage && human) {
        const humanRoundScores = this.roundHistory.map(rh => ({
          letter: rh.letter,
          score: rh.roundScores[human.id] ? rh.roundScores[human.id].totalPoints : 0,
          words: Object.values(rh.categoryResults).map(cat => (cat[human.id] && cat[human.id].isValid) ? cat[human.id].word : '')
        }));

        const humanRoundsWon = this.roundHistory.filter(rh => rh.winnerId === human.id).length;

        storage.updateStats({
          gameWon: isHumanWinner,
          roundsPlayed: this.roundHistory.length,
          roundsWon: humanRoundsWon,
          gameScore: this.cumulativeScores[human.id] || 0,
          roundScores: humanRoundScores
        });

        storage.addGameToHistory({
          rounds: this.roundHistory.length,
          won: isHumanWinner,
          score: this.cumulativeScores[human.id] || 0,
          winnerName: winner ? winner.name : '',
          difficulty: this.settings.botDifficulty
        });

        storage.clearActiveRound();
      }

      this.transitionState(STATES.GAME_OVER);

      if (audio) {
        if (isHumanWinner) {
          audio.playVictory();
        } else {
          audio.playDefeat();
        }
      }
    }

    transitionState(newState) {
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(this.state, this);
      }
    }
  }

  return {
    STATES,
    GameEngine
  };
});
