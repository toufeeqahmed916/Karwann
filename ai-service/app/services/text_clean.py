"""Small safety net for model text shown to people in English, Urdu or Sindhi."""
from __future__ import annotations

import re

# Models occasionally slip one stray letter from an unrelated script (for example Oriya or Devanagari) into an Urdu
# or Sindhi sentence. Karwan never uses those scripts, so they are removed instead of being shown or read aloud.
_STRAY_SCRIPTS = re.compile("[\u0900-\u0DFF\u0E00-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u3040-\u30FF\u4E00-\u9FFF]")


def strip_stray_scripts(text: str) -> str:
    return _STRAY_SCRIPTS.sub("", text)
