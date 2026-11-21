# WaitWalk CJK font

`WaitWalkCJK-Regular.ttf` is a renamed and subsetted static Regular instance of **Noto Sans SC**. The upstream font and this derivative are distributed under **SIL Open Font License 1.1** (see `OFL.txt`); the application's own code is separately MIT licensed.

- Upstream: [Noto Sans SC in Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosanssc)
- Source file: `NotoSansSC[wght].ttf` (upstream font SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`)
- Derivative SHA-256: `25ea1e62062a8139c55d539ec854be60d5d2cb62c5afe6a369af2f6cbd027a33`
- Modifications: static weight 400, font family/name changed to WaitWalk CJK, hinting removed, and subset to GB 2312, basic Latin and common punctuation, plus the glyphs used by the WaitWalk application.

The built-in bilingual demo and app labels do not depend on a system font. Uncommon glyphs in live place labels may require an installed Unicode/CJK font. Native rendering also loads available local system fonts unless disabled for a portability test; original place spellings are not changed to fake translations.

Reproduce the font with Python 3 and `fonttools` using `python subset-font.py INPUT.ttf WaitWalkCJK-Regular.ttf` from this folder. The source must be obtained independently from the above upstream project.
