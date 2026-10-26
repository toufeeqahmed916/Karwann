// Place names. Karwan stores them in English ("Dadu"); people may type or speak them in Urdu or Sindhi script.
// canonicalPlace() turns any known spelling back into the stored English name, so the same place is always the same
// record, and translatePlace() (backendText.js) can show it in whichever language is selected.

// Look-alike letters of Urdu and Sindhi are treated as one letter (for example ي/ی, ڪ/ک, ڻ/ن).
const LETTERS = {
  "ي": "ی", "ى": "ی", "ې": "ی", "ے": "ی", "ك": "ک", "ڪ": "ک", "ه": "ہ", "ھ": "ہ", "ة": "ہ", "ۃ": "ہ", "ە": "ہ",
  "ڻ": "ن", "ڳ": "گ", "ڙ": "ڑ", "ٽ": "ٹ", "ٺ": "ٹ", "ڏ": "د", "ڍ": "د", "ڌ": "د", "ڊ": "ڈ",
  "ٿ": "ت", "ڀ": "ب", "ٻ": "ب", "ڦ": "پ", "ڇ": "چ", "ڃ": "ج", "ڄ": "ج",
};
const STRIP = /[ً-ٰ‌‍\s\-_.]+/g; // vowel marks, joiners, spaces, hyphens

export function normalisePlace(text) {
  return [...String(text ?? "").toLowerCase()].map((c) => LETTERS[c] ?? c).join("").replace(STRIP, "");
}

// English name -> other spellings (Urdu, Sindhi, common romanisations)
const ALIASES = {
  Badin: ["بدین", "بدين", "badeen"],
  Dadu: ["دادو", "dadoo"],
  Gambat: ["گمبٹ", "گمبٽ", "gambar"],
  Hyderabad: ["حیدرآباد", "حيدرآباد", "haidarabad"],
  Jacobabad: ["جیکب آباد", "جيڪب آباد", "جيڪبآباد", "jakobabad"],
  Karachi: ["کراچی", "ڪراچي"],
  Khairpur: ["خیرپور", "خيرپور"],
  Kotri: ["کوٹری", "ڪوٽڙي"],
  Larkana: ["لاڑکانہ", "لاڙڪاڻو", "لاڑکانا", "larkano"],
  Matiari: ["مٹیاری", "مٽياري", "matyari"],
  Mirpurkhas: ["میرپورخاص", "ميرپورخاص", "mirpur khas"],
  Nawabshah: ["نواب شاہ", "نواب شاهه", "نوابشاہ", "nawab shah"],
  Sanghar: ["سانگھڑ", "سانگهڙ"],
  Sehwan: ["سیہون", "سيوهڻ", "سہون", "sehwan sharif"],
  Sukkur: ["سکھر", "سکر"],
  "Tando Allahyar": ["ٹنڈو الہ یار", "ٽنڊو الهيار", "ٹنڈو اللہ یار", "tando allah yar"],
  Thatta: ["ٹھٹھہ", "ٺٽو", "ٹھٹہ", "thatto"],
  Sindh: ["سندھ", "سنڌ"],
};

const BY_SPELLING = new Map();
for (const [english, spellings] of Object.entries(ALIASES)) {
  for (const spelling of [english, ...spellings]) BY_SPELLING.set(normalisePlace(spelling), english);
}

/** The stored English name for a known place in any spelling, or null. */
export function canonicalPlace(text) {
  const key = normalisePlace(text);
  return key ? BY_SPELLING.get(key) ?? null : null;
}
