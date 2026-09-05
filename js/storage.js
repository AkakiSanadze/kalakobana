(function(root, factory) {
  const storage = factory(root.KALAKOBANA_CONFIG);
  if (typeof module === 'object' && module.exports) {
    module.exports = storage;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_STORAGE = storage;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(config) {
  'use strict';

  const defaultSettings = config ? config.DEFAULT_SETTINGS : {
    roundDuration: 90,
    totalRounds: 5,
    validationMode: 'self',
    botCount: 2,
    botDifficulty: 'medium',
    soundEnabled: true,
    hapticsEnabled: true,
    theme: 'auto',
    earlyFinishBonus: true,
    activeCategories: ['city', 'country', 'plant', 'animal', 'name', 'item', 'geography']
  };

  const STORAGE_KEYS = {
    SETTINGS: 'kalakobana_settings',
    STATS: 'kalakobana_stats',
    CUSTOM_DICT: 'kalakobana_custom_dict',
    HISTORY: 'kalakobana_history',
    SESSION_ROUND: 'kalakobana_active_round'
  };

  // Memory fallback in case localStorage / sessionStorage is blocked or full
  const memoryStore = {};
  const memorySession = {};

  function isLocalStorageAvailable() {
    try {
      const testKey = '__kalakobana_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isSessionStorageAvailable() {
    try {
      const testKey = '__kalakobana_stest__';
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const hasLocalStorage = typeof window !== 'undefined' && isLocalStorageAvailable();
  const hasSessionStorage = typeof window !== 'undefined' && isSessionStorageAvailable();

  function getItem(key) {
    if (hasLocalStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return memoryStore[key] || null;
      }
    }
    return memoryStore[key] || null;
  }

  function setItem(key, val) {
    if (hasLocalStorage) {
      try {
        window.localStorage.setItem(key, val);
        return;
      } catch (e) {
        // Fallback to memory if quota exceeded
      }
    }
    memoryStore[key] = val;
  }

  function removeItem(key) {
    if (hasLocalStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    }
    delete memoryStore[key];
  }

  // --- Settings ---
  function getSettings() {
    try {
      const raw = getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    } catch (e) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(settings) {
    try {
      setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings', e);
    }
  }

  // --- Stats ---
  const DEFAULT_STATS = {
    gamesPlayed: 0,
    gamesWon: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    totalPoints: 0,
    highestGameScore: 0,
    highestRoundScore: 0,
    letterStats: {}, // { 'ა': { played: 5, totalScore: 120 } }
    wordsCount: 0
  };

  function getStats() {
    try {
      const raw = getItem(STORAGE_KEYS.STATS);
      if (!raw) return { ...DEFAULT_STATS };
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULT_STATS };
    }
  }

  function updateStats(record) {
    // record: { gameWon: bool, roundsPlayed: int, roundsWon: int, gameScore: int, roundScores: [{letter, score, words: []}] }
    try {
      const stats = getStats();
      stats.gamesPlayed += 1;
      if (record.gameWon) stats.gamesWon += 1;
      stats.roundsPlayed += (record.roundsPlayed || 0);
      stats.roundsWon += (record.roundsWon || 0);
      stats.totalPoints += (record.gameScore || 0);
      stats.highestGameScore = Math.max(stats.highestGameScore, record.gameScore || 0);

      if (Array.isArray(record.roundScores)) {
        for (const r of record.roundScores) {
          stats.highestRoundScore = Math.max(stats.highestRoundScore, r.score || 0);
          if (r.letter) {
            stats.letterStats[r.letter] = stats.letterStats[r.letter] || { played: 0, totalScore: 0 };
            stats.letterStats[r.letter].played += 1;
            stats.letterStats[r.letter].totalScore += (r.score || 0);
          }
          if (Array.isArray(r.words)) {
            stats.wordsCount += r.words.filter(w => Boolean(w)).length;
          }
        }
      }

      setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      return stats;
    } catch (e) {
      console.warn('Could not update stats', e);
      return getStats();
    }
  }

  function resetStats() {
    removeItem(STORAGE_KEYS.STATS);
  }

  // --- Custom Dictionary ---
  // Store user-added words: [ { id, category, word, letter, addedAt } ]
  function getCustomDictionary() {
    try {
      const raw = getItem(STORAGE_KEYS.CUSTOM_DICT);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function addCustomWord(category, word, letter) {
    if (!word || !category) return false;
    const list = getCustomDictionary();
    const cleanWord = word.trim();
    // Check if already in custom dict
    const exists = list.some(item => item.category === category && item.word.toLowerCase() === cleanWord.toLowerCase());
    if (exists) return false;

    list.push({
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: category,
      word: cleanWord,
      letter: letter || cleanWord.charAt(0),
      addedAt: new Date().toISOString()
    });

    setItem(STORAGE_KEYS.CUSTOM_DICT, JSON.stringify(list));
    return true;
  }

  function removeCustomWord(id) {
    const list = getCustomDictionary();
    const filtered = list.filter(item => item.id !== id);
    setItem(STORAGE_KEYS.CUSTOM_DICT, JSON.stringify(filtered));
    return filtered;
  }

  function clearCustomDictionary() {
    removeItem(STORAGE_KEYS.CUSTOM_DICT);
  }

  function exportCustomDictionary() {
    const dict = getCustomDictionary();
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      words: dict
    }, null, 2);
  }

  function importCustomDictionary(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      const incoming = Array.isArray(parsed) ? parsed : (parsed.words || []);
      if (!Array.isArray(incoming)) throw new Error('არასწორი ფორმატი');

      const existing = getCustomDictionary();
      const existingKeys = new Set(existing.map(i => `${i.category}:${i.word.toLowerCase()}`));
      let added = 0;

      for (const item of incoming) {
        if (!item.word || !item.category) continue;
        const key = `${item.category}:${item.word.trim().toLowerCase()}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          existing.push({
            id: item.id || ('custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            category: item.category,
            word: item.word.trim(),
            letter: item.letter || item.word.trim().charAt(0),
            addedAt: item.addedAt || new Date().toISOString()
          });
          added++;
        }
      }

      setItem(STORAGE_KEYS.CUSTOM_DICT, JSON.stringify(existing));
      return { success: true, count: added, total: existing.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- Game History ---
  function getHistory(limit = 20) {
    try {
      const raw = getItem(STORAGE_KEYS.HISTORY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.slice(0, limit) : [];
    } catch (e) {
      return [];
    }
  }

  function addGameToHistory(gameSummary) {
    try {
      const list = getHistory(50);
      list.unshift({
        id: 'game_' + Date.now(),
        date: new Date().toISOString(),
        ...gameSummary
      });
      setItem(STORAGE_KEYS.HISTORY, JSON.stringify(list.slice(0, 30)));
    } catch (e) {}
  }

  // --- Session Storage (Active Round Recovery) ---
  function saveActiveRound(state) {
    try {
      const str = JSON.stringify(state);
      if (hasSessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ROUND, str);
      } else {
        memorySession[STORAGE_KEYS.SESSION_ROUND] = str;
      }
    } catch (e) {}
  }

  function getActiveRound() {
    try {
      let str = null;
      if (hasSessionStorage) {
        str = window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ROUND);
      } else {
        str = memorySession[STORAGE_KEYS.SESSION_ROUND];
      }
      return str ? JSON.parse(str) : null;
    } catch (e) {
      return null;
    }
  }

  function clearActiveRound() {
    try {
      if (hasSessionStorage) {
        window.sessionStorage.removeItem(STORAGE_KEYS.SESSION_ROUND);
      }
      delete memorySession[STORAGE_KEYS.SESSION_ROUND];
    } catch (e) {}
  }

  return {
    getSettings,
    saveSettings,
    getStats,
    updateStats,
    resetStats,
    getCustomDictionary,
    addCustomWord,
    removeCustomWord,
    clearCustomDictionary,
    exportCustomDictionary,
    importCustomDictionary,
    getHistory,
    addGameToHistory,
    saveActiveRound,
    getActiveRound,
    clearActiveRound
  };
});
