const fs = require('fs');
const path = require('path');

const mappings = [
  { builder: 'plants.js', target: 'plants.js', key: 'plant', label: 'მცენარე' },
  { builder: 'animals.js', target: 'animals.js', key: 'animal', label: 'ცხოველი' },
  { builder: 'geography.js', target: 'geography.js', key: 'geography', label: 'გეოგრაფიული ობიექტი' },
  { builder: 'names.js', target: 'names.js', key: 'name', label: 'სახელი' },
  { builder: 'items.js', target: 'items.js', key: 'item', label: 'ნივთი' },
  { builder: 'cars.js', target: 'cars.js', key: 'car', label: 'ავტომობილი' },
  { builder: 'professions.js', target: 'professions.js', key: 'profession', label: 'პროფესია' },
  { builder: 'dishes.js', target: 'dishes.js', key: 'dish', label: 'კერძი / საკვები' },
  { builder: 'celebrities.js', target: 'celebrities.js', key: 'celebrity', label: 'ცნობილი ადამიანი' },
  { builder: 'media.js', target: 'media.js', key: 'media', label: 'ფილმი / წიგნი' },
  { builder: 'sports.js', target: 'sports.js', key: 'sport', label: 'სპორტი' },
  { builder: 'adjectives.js', target: 'adjectives.js', key: 'adjective', label: 'ფერი / თვისება' }
];

function compileAll() {
  console.log('Compiling datasets from tools/builders/ into data/ ...');
  for (const m of mappings) {
    const builderPath = path.join(__dirname, 'builders', m.builder);
    if (!fs.existsSync(builderPath)) {
      console.error(`Missing builder: ${m.builder}`);
      continue;
    }
    const words = require(builderPath);

    // Ensure words are sorted by word or Georgian alphabetical order
    words.sort((a, b) => a.w.localeCompare(b.w, 'ka'));

    const content = `(function(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = data;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_DATA = root.KALAKOBANA_DATA || {};
    root.KALAKOBANA_DATA['${m.key}'] = data;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  return {
    category: "${m.key}",
    label: "${m.label}",
    words: ${JSON.stringify(words, null, 2)}
  };
});
`;

    const targetPath = path.join(__dirname, '..', 'data', m.target);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`✓ Generated ${m.target} (${words.length} items)`);
  }
  console.log('Done compiling datasets.');
}

compileAll();
