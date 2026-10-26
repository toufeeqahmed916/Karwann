"""Place names in Urdu and Sindhi script, so a question like "بدين کي گهٽ پاڻي ڇو مليو؟" finds the Badin records.

Karwan stores place names in English; people ask in English, Urdu or Sindhi. Matching is done on a normalised form
where the look-alike letters of Urdu and Sindhi (for example ي/ی, ڪ/ک, ڻ/ن) are treated as the same letter.
"""
from __future__ import annotations

import re

_LETTER_MAP = str.maketrans({
    "ي": "ی", "ى": "ی", "ې": "ی", "ے": "ی",
    "ك": "ک", "ڪ": "ک",
    "ه": "ہ", "ھ": "ہ", "ة": "ہ", "ۃ": "ہ", "ە": "ہ",
    "ڻ": "ن", "ڳ": "گ", "ڙ": "ڑ", "ٽ": "ٹ", "ٺ": "ٹ", "ڏ": "د", "ڍ": "د", "ڌ": "د", "ڊ": "ڈ",
    "ٿ": "ت", "ڀ": "ب", "ٻ": "ب", "ڦ": "پ", "ڇ": "چ", "ڃ": "ج", "ڄ": "ج",
})
_STRIP = re.compile(r"[ً-ٰٟ‌‍\s\-_.]+")  # vowel marks, joiners, spaces, hyphens


def normalise(text: str) -> str:
    return _STRIP.sub("", (text or "").lower().translate(_LETTER_MAP))


# English name (lower case, as stored by Karwan) -> spellings in Urdu / Sindhi script and common romanisations.
ALIASES: dict[str, list[str]] = {
    "badin": ["بدین", "بدين", "badeen"],
    "dadu": ["دادو", "dadoo"],
    "gambat": ["گمبٹ", "گمبٽ", "gambar"],
    "hyderabad": ["حیدرآباد", "حيدرآباد", "حیدرآباد", "haidarabad", "hyderabad"],
    "jacobabad": ["جیکب آباد", "جيڪب آباد", "جيڪبآباد", "jakobabad", "jacobabad"],
    "karachi": ["کراچی", "ڪراچي", "karachi"],
    "khairpur": ["خیرپور", "خيرپور", "khairpur"],
    "kotri": ["کوٹری", "ڪوٽڙي", "kotri"],
    "larkana": ["لاڑکانہ", "لاڙڪاڻو", "لاڑکانا", "larkano"],
    "matiari": ["مٹیاری", "مٽياري", "matyari"],
    "mirpurkhas": ["میرپورخاص", "ميرپورخاص", "mirpur khas"],
    "nawabshah": ["نواب شاہ", "نواب شاهه", "نوابشاہ", "nawab shah"],
    "sanghar": ["سانگھڑ", "سانگهڙ", "sanghar"],
    "sehwan": ["سیہون", "سيوهڻ", "سہون", "sehwan sharif"],
    "sukkur": ["سکھر", "سکر", "sukkur"],
    "tando allahyar": ["ٹنڈو الہ یار", "ٽنڊو الهيار", "ٹنڈو اللہ یار", "tando allah yar"],
    "thatta": ["ٹھٹھہ", "ٺٽو", "ٹھٹہ", "thatto"],
}
_NORMALISED = {name: [normalise(alias) for alias in (name, *aliases)] for name, aliases in ALIASES.items()}


_BY_SPELLING = {spelling: name for name, spellings in _NORMALISED.items() for spelling in spellings}


def canonical_place(text: str | None) -> str | None:
    """The English name Karwan stores ("Dadu") for a place written in any known spelling (English, Urdu or Sindhi script),
    or None when the text is not a known place. Used so the area of a spoken report is never saved in another script."""
    key = normalise(text or "")
    name = _BY_SPELLING.get(key) if key else None
    return name.title() if name else None


def place_in_text(place: str, text: str) -> bool:
    """True when `place` (an English name stored by Karwan) is mentioned in `text` in English, Urdu or Sindhi."""
    haystack = normalise(text)
    if not haystack:
        return False
    key = (place or "").strip().lower()
    candidates = _NORMALISED.get(key) or [normalise(key)]
    return any(candidate and candidate in haystack for candidate in candidates)
