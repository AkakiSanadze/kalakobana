const test = require('node:test');
const assert = require('node:assert');
const validator = require('../js/validator.js');

test('normalizeGeorgian handles Mkhedruli, Mtavruli, apostrophes, and punctuation', () => {
  // Mkhedruli basic
  assert.strictEqual(validator.normalizeGeorgian(' თბილისი '), 'თბილისი');

  // Mtavruli (U+1C90..U+1CBF) conversion to Mkhedruli
  const mtavruliTbilisi = 'ᲗᲑᲘᲚᲘᲡᲘ';
  assert.strictEqual(validator.normalizeGeorgian(mtavruliTbilisi), 'თბილისი');

  // Hyphens, quotes, and punctuation
  assert.strictEqual(validator.normalizeGeorgian('კოტ-დ’ივუარი'), 'კოტ დივუარი');
  assert.strictEqual(validator.normalizeGeorgian('„საქართველო“'), 'საქართველო');
  assert.strictEqual(validator.normalizeGeorgian('მე, ბებია, ილიკო და ილარიონი!'), 'მე ბებია ილიკო და ილარიონი');
});

test('getFirstLetter extracts normalized first Mkhedruli letter', () => {
  assert.strictEqual(validator.getFirstLetter('ᲗᲑᲘᲚᲘᲡᲘ'), 'თ');
  assert.strictEqual(validator.getFirstLetter('  ბათუმი'), 'ბ');
  assert.strictEqual(validator.getFirstLetter(''), '');
});

test('Dictionary index lookup and aliases', () => {
  const mockDatasets = {
    city: {
      category: 'city',
      words: [
        { w: 'თბილისი', popularity: 5, aliases: ['ტფილისი'], note: 'დედაქალაქი' },
        { w: 'ბათუმი', popularity: 5, aliases: [], note: 'საზღვაო ქალაქი' }
      ]
    },
    country: {
      category: 'country',
      words: [
        { w: 'საქართველო', popularity: 5, aliases: ['საქართველოს რესპუბლიკა'], note: 'ჩვენი სამშობლო' }
      ]
    }
  };

  validator.initIndex(mockDatasets);

  const direct = validator.lookupWord('city', 'თბილისი');
  assert.ok(direct, 'Should find თბილისი');
  assert.strictEqual(direct.w, 'თბილისი');

  const aliasMatch = validator.lookupWord('city', 'ტფილისი');
  assert.ok(aliasMatch, 'Should find alias ტფილისი');
  assert.strictEqual(aliasMatch.canonicalNorm, 'თბილისი');

  const mtavruliMatch = validator.lookupWord('country', 'ᲡᲐᲥᲐᲠᲗᲕᲔᲚᲝ');
  assert.ok(mtavruliMatch, 'Should find Mtavruli word');
  assert.strictEqual(mtavruliMatch.w, 'საქართველო');
});

test('validateInput rules: too short, wrong letter, duplicate, strict, self, free', () => {
  const mockDatasets = {
    city: {
      category: 'city',
      words: [{ w: 'თბილისი', popularity: 5, aliases: [] }]
    }
  };
  validator.initIndex(mockDatasets);

  // Too short
  const shortRes = validator.validateInput({ category: 'city', word: 'თ', letter: 'თ' });
  assert.strictEqual(shortRes.status, 'too_short');

  // Wrong letter
  const wrongLetterRes = validator.validateInput({ category: 'city', word: 'ბათუმი', letter: 'თ' });
  assert.strictEqual(wrongLetterRes.status, 'wrong_letter');

  // Duplicate in another category
  const dupRes = validator.validateInput({
    category: 'geography',
    word: 'თბილისი',
    letter: 'თ',
    otherInputs: ['თბილისი']
  });
  assert.strictEqual(dupRes.status, 'duplicate');

  // Valid in strict mode
  const validRes = validator.validateInput({ category: 'city', word: 'თბილისი', letter: 'თ', mode: 'strict' });
  assert.strictEqual(validRes.status, 'valid');

  // Unknown in strict mode -> invalid
  const strictUnknownRes = validator.validateInput({ category: 'city', word: 'თელავი', letter: 'თ', mode: 'strict' });
  assert.strictEqual(strictUnknownRes.status, 'invalid');

  // Unknown in self mode -> unknown
  const selfUnknownRes = validator.validateInput({ category: 'city', word: 'თელავი', letter: 'თ', mode: 'self' });
  assert.strictEqual(selfUnknownRes.status, 'unknown');

  // Unknown in free mode -> valid
  const freeRes = validator.validateInput({ category: 'city', word: 'თელავი', letter: 'თ', mode: 'free' });
  assert.strictEqual(freeRes.status, 'valid');
});

test('Celebrity surname-first standard: allows surname, full surname+name, and name+surname lookup', () => {
  const mockDatasets = {
    celebrity: {
      category: 'celebrity',
      words: [
        { w: 'ტაბიძე გალაკტიონ', popularity: 5, aliases: ['ტაბიძე', 'გალაკტიონ ტაბიძე'], note: 'პოეტი' },
        { w: 'დოილი არტურ კონან', popularity: 4, aliases: ['დოილი', 'არტურ კონან დოილი'], note: 'მწერალი' }
      ]
    }
  };
  validator.initIndex(mockDatasets);

  // Direct surname-first start
  const direct = validator.lookupWord('celebrity', 'ტაბიძე გალაკტიონ');
  assert.ok(direct);
  assert.strictEqual(direct.w, 'ტაბიძე გალაკტიონ');

  // Surname only
  const surnameMatch = validator.lookupWord('celebrity', 'ტაბიძე');
  assert.ok(surnameMatch, 'Surname ტაბიძე should be found');
  assert.strictEqual(surnameMatch.w, 'ტაბიძე გალაკტიონ');

  // Natural name order
  const naturalMatch = validator.lookupWord('celebrity', 'გალაკტიონ ტაბიძე');
  assert.ok(naturalMatch, 'Natural გალაკტიონ ტაბიძე should be found');

  // 3-word surname
  const doyle = validator.lookupWord('celebrity', 'დოილი');
  assert.ok(doyle, 'Surname დოილი should be found');

  // Validate on letter ტ with surname ტაბიძე
  const validOnT = validator.validateInput({
    category: 'celebrity',
    word: 'ტაბიძე',
    letter: 'ტ',
    mode: 'strict'
  });
  assert.strictEqual(validOnT.status, 'valid');

  // Validate on letter ტ with surname+name
  const validOnTFull = validator.validateInput({
    category: 'celebrity',
    word: 'ტაბიძე გალაკტიონ',
    letter: 'ტ',
    mode: 'strict'
  });
  assert.strictEqual(validOnTFull.status, 'valid');

  // Validate on letter გ with natural name (alias)
  const validOnG = validator.validateInput({
    category: 'celebrity',
    word: 'გალაკტიონ ტაბიძე',
    letter: 'გ',
    mode: 'strict'
  });
  assert.strictEqual(validOnG.status, 'valid');
});
