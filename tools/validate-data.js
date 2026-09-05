const fs = require('fs');
const path = require('path');

const letters = require('../data/letters.js');

const CATEGORIES = [
  { file: 'cities.js', key: 'city', label: 'ქალაქი', min: 400 },
  { file: 'countries.js', key: 'country', label: 'ქვეყანა', min: 195 },
  { file: 'plants.js', key: 'plant', label: 'მცენარე', min: 300 },
  { file: 'animals.js', key: 'animal', label: 'ცხოველი', min: 300 },
  { file: 'geography.js', key: 'geography', label: 'გეოგრაფიული ობიექტი', min: 300 },
  { file: 'names.js', key: 'name', label: 'სახელი', min: 500 },
  { file: 'items.js', key: 'item', label: 'ნივთი', min: 500 },
  { file: 'cars.js', key: 'car', label: 'ავტომობილი', min: 150 },
  { file: 'professions.js', key: 'profession', label: 'პროფესია', min: 150 },
  { file: 'dishes.js', key: 'dish', label: 'კერძი / საკვები', min: 150 },
  { file: 'celebrities.js', key: 'celebrity', label: 'ცნობილი პიროვნება', min: 150 },
  { file: 'media.js', key: 'media', label: 'ფილმი / წიგნი', min: 150 },
  { file: 'sports.js', key: 'sport', label: 'სპორტი', min: 150 },
  { file: 'adjectives.js', key: 'adjective', label: 'ფერი / თვისება', min: 150 }
];

function normalizeGeorgian(text) {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/[\u1C90-\u1CBF]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x1C90 + 0x10D0))
    .toLowerCase()
    .replace(/[-–—_]/g, ' ')
    .replace(/['"„“”’‘`ʼ՚ʻ]/g, '')
    .replace(/[,.:;!?()«»[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstLetter(word) {
  const norm = normalizeGeorgian(word);
  return norm ? norm.charAt(0) : '';
}

function runValidation() {
  console.log('=== ქალაქობანა: მონაცემთა ბაზის ვალიდაცია ===\n');
  let hasErrors = false;
  let totalWordsCount = 0;

  const letterList = letters.map(l => l.letter);
  const matrix = {}; // [letter][catKey] = count
  for (const l of letterList) {
    matrix[l] = {};
    for (const cat of CATEGORIES) {
      matrix[l][cat.key] = 0;
    }
  }

  const categoryStats = [];

  for (const cat of CATEGORIES) {
    const filePath = path.join(__dirname, '..', 'data', cat.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  ფაილი ჯერ არ არსებობს: ${cat.file}`);
      categoryStats.push({ ...cat, count: 0, status: 'არ არსებობს' });
      continue;
    }

    delete require.cache[require.resolve(filePath)];
    const catData = require(filePath);

    if (!catData || !Array.isArray(catData.words)) {
      console.error(`❌ არასწორი სტრუქტურა ${cat.file}: catData.words არ არის მასივი`);
      hasErrors = true;
      continue;
    }

    const seenNormalized = new Map();
    let catValidCount = 0;

    catData.words.forEach((entry, idx) => {
      if (!entry || !entry.w || typeof entry.w !== 'string') {
        console.error(`❌ [${cat.key} #${idx}] სიტყვა ცარიელია ან არასწორია:`, entry);
        hasErrors = true;
        return;
      }

      const raw = entry.w.trim();
      const norm = normalizeGeorgian(raw);
      if (norm.length < 2) {
        console.error(`❌ [${cat.key} #${idx}] სიტყვა "${raw}" ძალიან მოკლეა (< 2 სიმბოლო)`);
        hasErrors = true;
      }

      // Check for non-Georgian characters (allow spaces, hyphens, dots, numbers)
      const nonGeo = norm.replace(/[\u10D0-\u10FF 0-9]/g, '');
      if (nonGeo.length > 0) {
        console.error(`❌ [${cat.key} #${idx}] სიტყვა "${raw}" შეიცავს არაქართულ სიმბოლოებს: "${nonGeo}"`);
        hasErrors = true;
      }

      // Check popularity
      if (typeof entry.popularity !== 'number' || entry.popularity < 1 || entry.popularity > 5) {
        console.error(`❌ [${cat.key} #${idx}] "${raw}" არასწორი popularity (უნდა იყოს 1..5): ${entry.popularity}`);
        hasErrors = true;
      }

      // Check duplicate
      if (seenNormalized.has(norm)) {
        console.warn(`⚠️  [${cat.key}] დუბლიკატი: "${raw}" (ადრე: "${seenNormalized.get(norm)}")`);
      } else {
        seenNormalized.set(norm, raw);
      }

      const firstChar = getFirstLetter(raw);
      if (!matrix[firstChar]) {
        console.error(`❌ [${cat.key} #${idx}] "${raw}" პირველი ასო "${firstChar}" არ არის ქართულ ანბანში!`);
        hasErrors = true;
      } else {
        matrix[firstChar][cat.key]++;
      }

      catValidCount++;
    });

    totalWordsCount += catValidCount;
    categoryStats.push({
      ...cat,
      count: catValidCount,
      uniqueCount: seenNormalized.size,
      status: catValidCount >= cat.min ? '✅ კარგი' : `⚠️ ნაკლებია მინიმუმზე (${catValidCount}/${cat.min})`
    });
  }

  // Print category summary
  console.log('--- კატეგორიების რეზიუმე ---');
  console.table(categoryStats.map(s => ({
    'კატეგორია': s.label,
    'გასაღები': s.key,
    'სიტყვები': s.count,
    'მინიმუმი': s.min,
    'სტატუსი': s.status
  })));

  console.log(`\nსულ სიტყვები ბაზაში: ${totalWordsCount}`);

  // Check letter coverage
  console.log('\n--- ასოების დაფარვა (33 ასო) ---');
  const letterCoverage = letterList.map(l => {
    let coveredCats = 0;
    let totalInLetter = 0;
    for (const cat of CATEGORIES) {
      const cnt = matrix[l][cat.key];
      if (cnt > 0) coveredCats++;
      totalInLetter += cnt;
    }
    return {
      'ასო': l,
      'კატეგორიები (14-დან)': coveredCats,
      'სულ სიტყვა': totalInLetter
    };
  });
  console.table(letterCoverage);

  if (hasErrors) {
    console.error('\n❌ ვალიდაცია ვერ გაიარა! გაასწორეთ შეცდომები.');
    process.exit(1);
  } else {
    console.log('\n✅ ყველა შემოწმებული ფაილი ვალიდურია!');
  }

  return { totalWordsCount, categoryStats, matrix };
}

if (require.main === module) {
  runValidation();
}

module.exports = { runValidation, normalizeGeorgian, CATEGORIES };
