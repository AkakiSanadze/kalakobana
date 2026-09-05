(function(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = data;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_LETTERS = data;
    root.KALAKOBANA_DATA = root.KALAKOBANA_DATA || {};
    root.KALAKOBANA_DATA.letters = data;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  return [
    { letter: 'ა', name: 'ანი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ბ', name: 'ბანი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'გ', name: 'განი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'დ', name: 'დონი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ე', name: 'ენი', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ვ', name: 'ვინი', weight: 7, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ზ', name: 'ზენი', weight: 6, difficulty: 'medium', enabled: true, impossibleCategories: [] },
    { letter: 'თ', name: 'თანი', weight: 9, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ი', name: 'ინი', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'კ', name: 'კანი', weight: 9, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ლ', name: 'ლასი', weight: 9, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'მ', name: 'მანი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ნ', name: 'ნარი', weight: 9, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ო', name: 'ონი', weight: 7, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'პ', name: 'პარი', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ჟ', name: 'ჟანი', weight: 2, difficulty: 'hard', enabled: true, impossibleCategories: ['country'] },
    { letter: 'რ', name: 'რაე', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ს', name: 'სანი', weight: 10, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ტ', name: 'ტარი', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'უ', name: 'უნი', weight: 6, difficulty: 'medium', enabled: true, impossibleCategories: [] },
    { letter: 'ფ', name: 'ფარი', weight: 8, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ქ', name: 'ქანი', weight: 9, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ღ', name: 'ღანი', weight: 2, difficulty: 'hard', enabled: true, impossibleCategories: ['country', 'car'] },
    { letter: 'ყ', name: 'ყარი', weight: 4, difficulty: 'hard', enabled: true, impossibleCategories: [] },
    { letter: 'შ', name: 'შინი', weight: 7, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ჩ', name: 'ჩინი', weight: 6, difficulty: 'medium', enabled: true, impossibleCategories: [] },
    { letter: 'ც', name: 'ცანი', weight: 6, difficulty: 'medium', enabled: true, impossibleCategories: [] },
    { letter: 'ძ', name: 'ძილი', weight: 2, difficulty: 'hard', enabled: true, impossibleCategories: ['country', 'car'] },
    { letter: 'წ', name: 'წილი', weight: 4, difficulty: 'medium', enabled: true, impossibleCategories: ['car'] },
    { letter: 'ჭ', name: 'ჭარი', weight: 3, difficulty: 'hard', enabled: true, impossibleCategories: ['country', 'car'] },
    { letter: 'ხ', name: 'ხანი', weight: 7, difficulty: 'easy', enabled: true, impossibleCategories: [] },
    { letter: 'ჯ', name: 'ჯანი', weight: 4, difficulty: 'hard', enabled: true, impossibleCategories: [] },
    { letter: 'ჰ', name: 'ჰაე', weight: 2, difficulty: 'hard', enabled: true, impossibleCategories: [] }
  ];
});
