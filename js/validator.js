(function(root, factory) {
  const validator = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = validator;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_VALIDATOR = validator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Normalize Georgian text
  function normalizeGeorgian(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .normalize('NFC')
      // Mtavruli (U+1C90..U+1CBF) to Mkhedruli (U+10D0..U+10FF)
      .replace(/[\u1C90-\u1CBF]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x1C90 + 0x10D0))
      .toLowerCase()
      // Hyphens/dashes to space
      .replace(/[-–—_]/g, ' ')
      // Remove quotes and apostrophes
      .replace(/['"„“”’‘`ʼ՚ʻ]/g, '')
      // Punctuation to space
      .replace(/[,.:;!?()«»[\]{}]/g, ' ')
      // Collapse multiple whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getFirstLetter(word) {
    const norm = normalizeGeorgian(word);
    return norm ? norm.charAt(0) : '';
  }

  // Fast O(1) lookup dictionary
  // Map key: `${category}:${normalizedWord}` -> { w, popularity, note, aliases, isCustom }
  const wordIndex = new Map();
  let isInitialized = false;

  function initIndex(datasets, customWords = []) {
    wordIndex.clear();

    if (datasets && typeof datasets === 'object') {
      for (const [catKey, catObj] of Object.entries(datasets)) {
        if (!catObj || !Array.isArray(catObj.words)) continue;
        for (const entry of catObj.words) {
          if (!entry || !entry.w) continue;
          addEntryToIndex(catKey, entry, false);
        }
      }
    }

    if (Array.isArray(customWords)) {
      for (const c of customWords) {
        if (!c || !c.word || !c.category) continue;
        addEntryToIndex(c.category, { w: c.word, popularity: 5, aliases: [], note: 'მომხმარებლის სიტყვა' }, true);
      }
    }

    isInitialized = true;
  }

  function addEntryToIndex(category, entry, isCustom = false) {
    const mainNorm = normalizeGeorgian(entry.w);
    if (!mainNorm) return;

    const payload = {
      w: entry.w,
      canonicalNorm: mainNorm,
      popularity: entry.popularity || 3,
      note: entry.note || '',
      aliases: entry.aliases || [],
      isCustom: Boolean(isCustom)
    };

    const key = `${category}:${mainNorm}`;
    wordIndex.set(key, payload);

    if (Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        const aliasNorm = normalizeGeorgian(alias);
        if (aliasNorm && aliasNorm !== mainNorm) {
          wordIndex.set(`${category}:${aliasNorm}`, payload);
        }
      }
    }

    // Automatically index surnames and inverted names for celebrities
    if (category === 'celebrity') {
      const parts = mainNorm.split(' ').filter(Boolean);
      if (parts.length === 2) {
        const [firstName, lastName] = parts;
        if (lastName.length >= 3) {
          const surnameKey = `celebrity:${lastName}`;
          if (!wordIndex.has(surnameKey)) {
            wordIndex.set(surnameKey, payload);
          }
          const invertedKey = `celebrity:${lastName} ${firstName}`;
          if (!wordIndex.has(invertedKey)) {
            wordIndex.set(invertedKey, payload);
          }
        }
      } else if (parts.length === 3) {
        const lastName = parts[parts.length - 1];
        if (lastName.length >= 3) {
          const surnameKey = `celebrity:${lastName}`;
          if (!wordIndex.has(surnameKey)) {
            wordIndex.set(surnameKey, payload);
          }
        }
      }
    }
  }

  function lookupWord(category, word) {
    const norm = normalizeGeorgian(word);
    if (!norm) return null;
    const key = `${category}:${norm}`;
    return wordIndex.get(key) || null;
  }

  /**
   * Validate a single word input.
   * @param {Object} params
   * @param {string} params.category - category ID (e.g. 'city')
   * @param {string} params.word - user input word
   * @param {string} params.letter - current round letter
   * @param {string[]} [params.otherInputs] - other words currently entered by the player in this round
   * @param {string} [params.mode='self'] - 'strict' | 'self' | 'free'
   * @returns {Object} result: { status, message, norm, entry }
   */
  function validateInput({ category, word, letter, otherInputs = [], mode = 'self' }) {
    if (!word || typeof word !== 'string' || !word.trim()) {
      return {
        status: 'empty',
        message: 'ცარიელია',
        norm: '',
        entry: null
      };
    }

    const norm = normalizeGeorgian(word);
    const targetLetter = normalizeGeorgian(letter);

    if (norm.length < 2) {
      return {
        status: 'too_short',
        message: 'ძალიან მოკლეა (მინიმუმ 2 ასო)',
        norm,
        entry: null
      };
    }

    const firstChar = norm.charAt(0);
    if (firstChar !== targetLetter) {
      return {
        status: 'wrong_letter',
        message: `უნდა იწყებოდეს ასო „${targetLetter}“-ზე`,
        norm,
        entry: null
      };
    }

    // Check duplicate in same round across other categories
    if (Array.isArray(otherInputs)) {
      for (const other of otherInputs) {
        if (!other) continue;
        const otherNorm = normalizeGeorgian(other);
        if (otherNorm === norm) {
          return {
            status: 'duplicate',
            message: 'ეს სიტყვა უკვე გამოყენებულია სხვა ველში',
            norm,
            entry: null
          };
        }
      }
    }

    const entry = lookupWord(category, norm);

    if (mode === 'free') {
      return {
        status: 'valid',
        message: entry ? 'სწორია' : 'მიღებულია (თავისუფალი რეჟიმი)',
        norm,
        entry: entry || { w: word.trim(), canonicalNorm: norm }
      };
    }

    if (entry) {
      return {
        status: 'valid',
        message: 'სწორია',
        norm,
        entry
      };
    }

    if (mode === 'self') {
      return {
        status: 'unknown',
        message: 'არ არის ბაზაში (საჭიროებს დადასტურებას)',
        norm,
        entry: null
      };
    }

    // strict mode
    return {
      status: 'invalid',
      message: 'სიტყვა ბაზაში ვერ მოიძებნა',
      norm,
      entry: null
    };
  }

  return {
    normalizeGeorgian,
    getFirstLetter,
    initIndex,
    addEntryToIndex,
    lookupWord,
    validateInput,
    getWordIndexSize: () => wordIndex.size
  };
});
