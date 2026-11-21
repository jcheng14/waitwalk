#!/usr/bin/env python3
"""Reproduce the checked-in WaitWalk CJK derivative from Google Fonts' Noto Sans SC variable TTF using fonttools."""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source, destination = map(Path, sys.argv[1:3])
# Standard GB2312 repertoire and typographic marks, plus glyphs in the route UI.
points = set(range(0x20, 0x100)) | set(range(0x2000, 0x2070)) | {0x2116, 0x2212, 0x2733}
for lead in range(0xA1, 0xF8):
    for trail in range(0xA1, 0xFF):
        try:
            points.add(ord(bytes([lead, trail]).decode("gb2312")))
        except UnicodeDecodeError:
            pass
source_dir = Path(__file__).resolve().parents[2] / "site"
for code in source_dir.glob("*.mjs"):
    points.update(ord(x) for x in code.read_text(encoding="utf-8") if "\u3000" <= x <= "\ufaff")
font = instantiateVariableFont(TTFont(source, recalcTimestamp=False), {"wght": 400}, inplace=True)
name = font["name"]
# Rename this modified derivative. Keep copyright/license identifiers unmodified.
names = {
    1:"WaitWalk CJK", 2:"Regular", 3:"WaitWalkCJK-Regular 1.0",
    4:"WaitWalk CJK Regular", 6:"WaitWalkCJK-Regular", 16:"WaitWalk CJK", 17:"Regular",
    18:"WaitWalk CJK Regular", 21:"WaitWalk CJK", 22:"Regular", 25:"WaitWalkCJK",
}
for entry in list(name.names):
    if entry.nameID in names:
        name.setName(names[entry.nameID], entry.nameID, entry.platformID, entry.platEncID, entry.langID)
for nid, text in names.items():
    if nid in (1,2,3,4,6,16,17):
        name.setName(text, nid, 3, 1, 0x409)
options = subset.Options()
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
options.hinting = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=points)
subsetter.subset(font)
font.recalcTimestamp = False
font.save(destination)
