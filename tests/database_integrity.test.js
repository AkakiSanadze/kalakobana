const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const files = [
  'countries.js', 'cities.js', 'plants.js', 'animals.js',
  'names.js', 'items.js', 'geography.js', 'cars.js',
  'professions.js', 'dishes.js', 'celebrities.js', 'media.js',
  'sports.js', 'adjectives.js'
];

test('Database Integrity: No duplicates in any category', () => {
  for (const f of files) {
    const mod = require(path.join(dataDir, f));
    const seen = new Set();
    const dups = [];
    for (const item of mod.words) {
      const lower = item.w.toLowerCase();
      if (seen.has(lower)) {
        dups.push(item.w);
      }
      seen.add(lower);
    }
    assert.strictEqual(dups.length, 0, `Category ${mod.category} contains duplicates: ${dups.join(', ')}`);
  }
});

test('Database Integrity: No synthetic suffixes or artificial city/celebrity tags', () => {
  const cities = require(path.join(dataDir, 'cities.js'));
  const suspectCity = cities.words.filter(x => /(\sქალაქი|\sდედაქალაქი|\sცენტრი)$/.test(x.w));
  assert.strictEqual(suspectCity.length, 0, `Cities contain synthetic suffixes: ${suspectCity.map(x => x.w).join(', ')}`);

  const celebs = require(path.join(dataDir, 'celebrities.js'));
  const suspectCeleb = celebs.words.filter(x => /(\sფიზიკოსი|\sმწერალი|\sფეხბურთელი|\sპოეტი|\sრეჟისორი|\sგამომგონებელი)$/.test(x.w));
  assert.strictEqual(suspectCeleb.length, 0, `Celebrities contain synthetic profession suffixes: ${suspectCeleb.map(x => x.w).join(', ')}`);
});

test('Database Integrity: Countries exclude occupied territories and fictional islands', () => {
  const countries = require(path.join(dataDir, 'countries.js'));
  const words = countries.words.map(x => x.w);
  assert.ok(!words.includes('სამხრეთ ოსეთი'), 'Countries should not list South Ossetia as foreign country');
  assert.ok(!words.includes('აფხაზეთი'), 'Countries should not list Abkhazia as foreign country');
  assert.ok(!words.includes('ოსტინის კუნძულები'), 'Countries should not list Austin islands');
});

test('Database Integrity: Inverted animal and plant pairings eliminated', () => {
  const animals = require(path.join(dataDir, 'animals.js'));
  const badAnimals = animals.words.filter(x => /^(ალბატროსი მოხეტიალე|ძაღლი დობერმანი|ცხენი არაბული|ბატი მთის)$/.test(x.w));
  assert.strictEqual(badAnimals.length, 0, 'Animals should not contain inverted biological pairs');

  const plants = require(path.join(dataDir, 'plants.js'));
  const badPlants = plants.words.filter(x => /^(ალუბალი მჟავე|ბალი თეთრი|ანჩოუსი მცენარე|ისპანახი ფოთლოვანი)$/.test(x.w));
  assert.strictEqual(badPlants.length, 0, 'Plants should not contain inverted biological pairs or fake plants');
});
