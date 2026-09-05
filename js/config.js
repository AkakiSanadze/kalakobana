(function(root, factory) {
  const config = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = config;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_CONFIG = config;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const ALL_CATEGORIES = [
    { id: 'city', label: 'ქალაქი', icon: '🏙️', isStandard: true, description: 'ქალაქი საქართველოში ან მსოფლიოში' },
    { id: 'country', label: 'ქვეყანა', icon: '🌍', isStandard: true, description: 'დამოუკიდებელი ქვეყანა ან ტერიტორია' },
    { id: 'plant', label: 'მცენარე', icon: '🌿', isStandard: true, description: 'ხე, ყვავილი, ბუჩქი, ბალახი ან ხილი' },
    { id: 'animal', label: 'ცხოველი', icon: '🦁', isStandard: true, description: 'ძუძუმწოვარი, ფრინველი, თევზი ან მწერი' },
    { id: 'name', label: 'სახელი', icon: '👤', isStandard: true, description: 'ადამიანის სახელი' },
    { id: 'item', label: 'ნივთი', icon: '📦', isStandard: true, description: 'საყოფაცხოვრებო ნივთი, ხელსაწყო' },
    { id: 'geography', label: 'გეოგრაფიული ობიექტი', icon: '⛰️', isStandard: true, description: 'მდინარე, მთა, ტბა, ზღვა, ოკეანე' },
    // დამატებითი კატეგორიები
    { id: 'car', label: 'ავტომობილი', icon: '🚗', isStandard: false, description: 'ავტომობილის მარკა ან მოდელი' },
    { id: 'profession', label: 'პროფესია', icon: '💼', isStandard: false, description: 'პროფესია ან საქმიანობა' },
    { id: 'dish', label: 'კერძი / საკვები', icon: '🍲', isStandard: false, description: 'ტრადიციული ან თანამედროვე კერძი' },
    { id: 'celebrity', label: 'ცნობილი ადამიანი', icon: '⭐', isStandard: false, description: 'მწერალი, მეფე, სპორტსმენი, მეცნიერი' },
    { id: 'media', label: 'ფილმი / წიგნი', icon: '🎬', isStandard: false, description: 'ფილმი, ანიმაცია ან ლიტერატურული ნაწარმოები' },
    { id: 'sport', label: 'სპორტი', icon: '⚽', isStandard: false, description: 'სპორტის სახეობა ან ოლიმპიური დისციპლინა' },
    { id: 'adjective', label: 'ფერი / თვისება', icon: '🎨', isStandard: false, description: 'ზედსართავი სახელი, ფერი ან თვისება' }
  ];

  const BOT_PROFILES = [
    { id: 'bot_giorgi', name: 'გიორგი', avatar: '👨‍💼', color: '#3b82f6', bio: 'გამოცდილი მოთამაშე' },
    { id: 'bot_nino', name: 'ნინო', avatar: '👩‍🔬', color: '#ec4899', bio: 'სწრაფი და დაკვირვებული' },
    { id: 'bot_dato', name: 'დათო', avatar: '👨‍🎨', color: '#10b981', bio: 'კლასიკური სტილის მოთამაშე' },
    { id: 'bot_mariam', name: 'მარიამი', avatar: '👩‍🏫', color: '#8b5cf6', bio: 'იშვიათი სიტყვების ოსტატი' },
    { id: 'bot_luka', name: 'ლუკა', avatar: '🧑‍🚀', color: '#f59e0b', bio: 'აზარტული და ენერგიული' },
    { id: 'bot_ana', name: 'ანა', avatar: '👩‍💻', color: '#06b6d4', bio: 'ერუდიტი და წიგნის მოყვარული' }
  ];

  const DEFAULT_SETTINGS = {
    roundDuration: 90, // seconds: 60, 90, 120, 180, 0 (no timer)
    totalRounds: 5,    // 3, 5, 10, 0 (endless)
    validationMode: 'self', // 'strict' | 'self' | 'free'
    botCount: 2,       // 1, 2, 3
    botDifficulty: 'medium', // 'easy' | 'medium' | 'hard'
    soundEnabled: true,
    hapticsEnabled: true,
    theme: 'auto',     // 'light' | 'dark' | 'auto'
    earlyFinishBonus: true,
    activeCategories: ALL_CATEGORIES.filter(c => c.isStandard).map(c => c.id)
  };

  const SCORING_RULES = {
    ONLY_ONE: 20,          // მხოლოდ ერთმა მოთამაშემ დაწერა სწორი პასუხი
    UNIQUE: 10,            // რამდენიმემ დაწერა, მაგრამ განსხვავებული სიტყვები
    DUPLICATE: 5,          // ორმა ან მეტმა დაწერა ერთი და იგივე სიტყვა (ან სინონიმი)
    INVALID: 0,            // არასწორი ან ცარიელი
    EARLY_FINISH_BONUS: 5  // ბონუსი ყველაზე ადრე დასრულებისთვის
  };

  const BOT_DIFFICULTY_PARAMS = {
    easy: {
      fillRateMin: 0.60,
      fillRateMax: 0.75,
      popularityWeight: { 5: 0.50, 4: 0.35, 3: 0.12, 2: 0.03, 1: 0.00 },
      errorChance: 0.08,
      answerTimeMinMs: 15000,
      answerTimeMaxMs: 50000
    },
    medium: {
      fillRateMin: 0.80,
      fillRateMax: 0.90,
      popularityWeight: { 5: 0.35, 4: 0.35, 3: 0.20, 2: 0.08, 1: 0.02 },
      errorChance: 0.02,
      answerTimeMinMs: 8000,
      answerTimeMaxMs: 35000
    },
    hard: {
      fillRateMin: 0.95,
      fillRateMax: 0.99,
      popularityWeight: { 5: 0.20, 4: 0.25, 3: 0.25, 2: 0.20, 1: 0.10 },
      errorChance: 0.00,
      answerTimeMinMs: 4000,
      answerTimeMaxMs: 20000
    }
  };

  return {
    ALL_CATEGORIES,
    BOT_PROFILES,
    DEFAULT_SETTINGS,
    SCORING_RULES,
    BOT_DIFFICULTY_PARAMS
  };
});
