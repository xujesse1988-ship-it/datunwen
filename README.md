# Datunwen · 大同语

**English** · [简体中文](README.zh-CN.md)

**Datunwen (大同语) — an engineered constructed language that carries grammar on a pitch channel and writes in a featural block script, aiming for Latin-grade explicitness on a Chinese-size syllable budget; ships as self-contained interactive HTML: design book, English course, trilingual dictionary, and neural audio demos.**

> 大同语是一门工程化设计的人造语言：语法信息由音高信道承载（词类不写进词典，由整词音高轮廓即时指派），文字是「韩文拼形 × 汉字形声」的二维方块，输入端是纯 ASCII。本仓库包含完整的中文设计书、英语入门课程、三语词典与神经语音参考音——全部为零依赖的单文件交互式 HTML，浏览器直接打开即用。

## Quick start

No build, no server, no network. Clone and open in any modern browser:

| File | What it is |
|---|---|
| [`datunwen.html`](datunwen.html) | **Design book (中文)** — phonology, pitch grammar, script, word-folding morphology, two translation stress tests. Ships a live glyph renderer, an in-page Klatt formant synthesizer (click any word to hear it), a typing sandbox, and embedded neural reference audio. |
| [`course-en.html`](course-en.html) | **A First Course (English)** — 8 lessons + exercises for native English speakers, from the sound system to reading the script, with a free-typing sandbox and full vocabulary appendix. |
| [`course-zh.html`](course-zh.html) | **入门课程（中文）** — course-en.html 的中文版：8 节课 + 练习，从语音、音高语法讲到读文字，例字与类比全部为中文读者重做（拼音对照、以「啊」的平/降/升类比词类音高、字调 vs 句调的澄清），含实时渲染发声沙盒与完整词汇附录。 |
| [`dictionary.html`](dictionary.html) | **Dictionary v0.2 (Datunwen → English / 中文)** — 263 entries, live search, type filters, bidirectional reverse indexes, and per-entry audio in all three pitch postures. |
| [`lexicon.json`](lexicon.json) | Machine-readable lexicon — the single source of truth for vocabulary (schema below). |
| [`tools/build-dictionary.js`](tools/build-dictionary.js) | Rebuilds `dictionary.html` from `lexicon.json`, reusing the engine and CSS from `datunwen.html`: `node tools/build-dictionary.js` |
| [`audio/`](audio/) | Six neural reference recordings (wav + mp3), generated offline by the Piper × WORLD pipeline described below. |

## The language in sixty seconds

Three design axioms drive everything:

1. **Two channels.** The mouth carries vocabulary; the larynx carries grammar. Every content word is spoken under one word-length pitch contour that assigns its part of speech in real time — level = argument (`ka` "knowledge"), falling = predicate (`kaq` "knows"), rising = modifier (`kaz` "cognitive"), low = particles. In spelling, two mute ASCII letters carry the contour: `-q` falling, `-z` rising. Nothing to memorize per word: three intonation rules, not a tone dictionary.
2. **Zero-marked defaults.** SVO order costs nothing; case particles appear only when you deviate. Tense is a scoped anchor set once per discourse (`tan` past · `nau` now · `fu` future), not a per-verb inflection. Timeless statements are legally unmarked.
3. **One word, one roof.** The pitch contour's domain = the word = the roof stroke over each written block. Sound, script, and syntax are three projections of the same object.

Phonology: 16 globally-common consonants (the letters *r*/*l* spell a single liquid phoneme), 5 vowels + 4 diphthongs, only coda *-n* — 288 possible syllables, arranged as an error-correcting code (no risky minimal pairs among core roots). Morphology: ~250 semantic primes fold into transparent right-headed compounds — *su+kau* "self-cause" = freedom (causa sui), *su+lin+din* "linked-selves' worth" = rights.

Two stress-test sentences (both clickable-audible in the design book):

```
en Xedinga e mau cuq lo mun io wi e tunseitai.
NAME Schrödinger 's cat is-at LOC death ⊕ life 's together-exist-state
“Schrödinger's cat is in a superposition of death and life.”
(io = the language's native non-classical connective: “both-and”, neither ∧ nor ∨)

mei ren an xinwi sukauq, i lo sudin i sulindin pinq.
∀ person at birth is-self-caused, and in self-worth and linked-selves-worth is-level
“All human beings are born free and equal in dignity and rights.” — UDHR Art. 1,
16 syllables: parity with the Chinese original, with every quantifier and predicate explicit.
```

## Data & tooling

`lexicon.json` = `{ meta, entries[] }`; each entry: `f` (form) · `kind` (root / pronoun / particle / comp) · `cls` (one of 7 silent classifier radicals or null) · `en` / `zh` glosses · `srcEN` / `srcZH` (mnemonic sources) · `parts` + `just` (compounds) · `num` (numeral flag) · `layer` (**canon** = from the design book · **v0.2-draft** = machine-drafted expansion, mechanically validated, awaiting field testing). To promote a draft entry, flip its `layer` and rerun the builder.

**Audio pipeline** (pre-generated in `audio/`, not rerun at build time): Piper neural TTS (voice `id_ID-news_tts-medium` — Indonesian happens to cover Datunwen's phoneme inventory almost 1:1) synthesizes segments morpheme-by-morpheme; the WORLD vocoder then decomposes each word and **replaces its entire F0 track with the grammatical contour** (plus declination and particle reduction) before resynthesis. Blind re-analysis of the output confirms the grammar is measurably in the waveform: `ka` level 287→273 Hz, `kaq` falling 318→183 Hz, `kaz` rising 199→314 Hz. The in-page click-to-speak audio is a separate, fully self-contained Klatt-style formant synthesizer (Web Audio, no assets).

## Method & status

The language was designed end-to-end in one Claude (Anthropic) session — phonology argued from cross-linguistic speech-rate/information-density data (Coupé, Oh, Dediu & Pellegrino 2019, *Science Advances*), phoneme inventory from typological frequency, with the lexicon layer expanded to v0.2 by parallel agents under hard validators (syllable legality · global uniqueness · minimal-pair firewall · compound decomposition) and human-in-the-loop arbitration. Known trade-offs are documented honestly in the design book, §6 (untested density estimates, whisper/amusia fallbacks, the philosophical load of semantic decomposition, look-alike risk in featural scripts).

Everything here is a **design proposal, not a community language** — the interesting question is whether the pitch-grammar and elastic-register ideas survive contact with real learners. Issues and experiments welcome.

*Datunwen = da 大 + tun 同 + wen 文 — “the great-together language.”*
