const COMBINING_MARKS = /\p{Mark}+/gu;
const SPECIAL_LATIN_LETTERS = /[æðđħıłøœßþŧ]/g;
const WHITESPACE = /\s+/g;

const LATIN_REPLACEMENTS: Record<string, string> = {
  'æ': 'ae',
  'ð': 'd',
  'đ': 'd',
  'ħ': 'h',
  'ı': 'i',
  'ł': 'l',
  'ø': 'o',
  'œ': 'oe',
  'ß': 'ss',
  'þ': 'th',
  'ŧ': 't',
};

/**
 * Produces the canonical value persisted in Product.searchName and used by
 * catalogue queries. NFKD separates letters from their diacritics, so a
 * search such as "lampara" also matches "Lámpara".
 */
export function normalizeProductSearch(value: string) {
  return value
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(SPECIAL_LATIN_LETTERS, (letter) => LATIN_REPLACEMENTS[letter])
    .trim()
    .replace(WHITESPACE, ' ');
}
