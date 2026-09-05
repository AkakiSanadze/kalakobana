const fs = require('fs');
const path = require('path');

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

function updateBuilder(filename, newWords) {
  const filePath = path.join(__dirname, 'builders', filename);
  let existing = [];
  if (fs.existsSync(filePath)) {
    existing = require(filePath);
  }

  const seen = new Set();
  for (const item of existing) {
    seen.add(normalizeGeorgian(item.w));
    if (item.aliases) {
      item.aliases.forEach(a => seen.add(normalizeGeorgian(a)));
    }
  }

  let addedCount = 0;
  for (const item of newWords) {
    const rawWord = typeof item === 'string' ? item : item.w;
    const norm = normalizeGeorgian(rawWord);
    if (!norm) continue;

    if (seen.has(norm)) continue;

    const wordObj = {
      w: rawWord.trim(),
      popularity: item.popularity || 3,
      aliases: (item.aliases || []).map(a => a.trim()).filter(Boolean),
      note: item.note || ''
    };

    existing.push(wordObj);
    seen.add(norm);
    wordObj.aliases.forEach(a => seen.add(normalizeGeorgian(a)));
    addedCount++;
  }

  existing.sort((a, b) => a.w.localeCompare(b.w, 'ka'));
  const content = `module.exports = ${JSON.stringify(existing, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`[${filename}] Added ${addedCount} new words. Total now: ${existing.length}`);
  return existing.length;
}

module.exports = {
  normalizeGeorgian,
  getFirstLetter,
  updateBuilder
};
