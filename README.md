# GPA Calculator

A static, bilingual (English / Arabic) GPA calculator built with React + Vite on the Personal Site Theme.

**Repository:** https://github.com/NaserAlmasoud/GPA-Calculator

- Terms → courses → grade components, with term GPA, cumulative GPA and credits
- Each course gets its grade distribution from text pasted into the **Syllabus / المنهج** box
- Per-item scores, addable items (quizzes, class work), drop-lowest / best-N-of-M, averaging
- Formula-based adjustments (e.g. class work shifted toward a target from the class medians)
- Letter grade from your own cutoffs, or picked by hand
- "What do I need?" for a target in each course, and a graduation calculator for a target CGPA
- Light / dark theme, Arabic RTL, and data saved in the browser

## Run

```bash
npm install
npm run dev       # local dev server
npm run build     # static site in dist/
npm test          # grade engine tests
```

`npm run build` produces **one self-contained file, `dist/index.html`** (scripts, styles and fonts inlined). Open it by double-clicking, or upload it to GitHub Pages, Netlify or any web host.

Note: the `index.html` in the project root is the Vite source entry. It only works through `npm run dev`; opening it directly shows a blank page.

## Project layout

```
src/
  lib/expr.js          safe formula evaluator (no eval)
  lib/distribution.js  reads and validates the pasted distribution text
  lib/grades.js        4.0 scale, course totals, adjustments, letters, GPA, calculators
  lib/storage.js       storage adapter (localStorage now; swap for a server later)
  store.js             app state, persistence, hash routing
  i18n.js              English and Arabic strings
  components/          Drawer, TermView, CourseView, modals
  theme/               theme.css + fonts (Personal Site Theme)
syllabi/               ready-to-paste distributions (MATH208-261.json)
tests/                 engine tests (node --test)
```

**Moving to a server later:** implement `load()` and `save(state)` against your API in `src/lib/storage.js` and export it as `storage`. Nothing else changes.

**Grade scale:** edit `SCALE` in `src/lib/grades.js` (currently A+ 4.00, A 3.75, B+ 3.50, B 3.00, C+ 2.50, C 2.00, D+ 1.50, D 1.00, F 0; DN counts as 0).

## Grade distribution format

Paste JSON like this into the Syllabus box:

```json
{
  "course": "MATH 208",
  "credits": 3,
  "total": 300,
  "components": [
    { "id": "exam1", "name": { "en": "Exam I", "ar": "الاختبار الأول" }, "max": 75 },
    { "id": "quizzes", "name": "Quizzes", "max": 15,
      "items": { "count": 5, "drop": 1, "combine": "points", "defaultMax": 10 } },
    { "id": "classwork", "name": { "en": "Class Work", "ar": "أعمال الفصل" }, "max": 45,
      "items": { "addable": true },
      "adjust": {
        "type": "shift",
        "inputs": { "m1": "Exam I median (%)", "m2": "Exam II median (%)", "avg": "Section average (/45)" },
        "target": "9/40 * (m1 + m2)",
        "range": 1.5,
        "of": "avg"
      } }
  ],
  "letter": { "mode": "curve" }
}
```

| Field | Meaning |
| --- | --- |
| `course`, `credits` | Optional. Fill the course name and credit hours when adding a course. |
| `total` | Course total. Defaults to the sum of the components' `max`. |
| `components[].max` | Points the component is worth (use percentages if the syllabus does, with `total: 100`). |
| `name` | A string, or `{ "en": ..., "ar": ... }`. |
| `items` | Makes the component a list of scores. `count`: fixed number of slots. `addable`: the student adds items with **+** (the default when there's no `count`). `combine`: `"points"` (sum of marks ÷ sum of max) or `"average"` (each item weighs the same). `drop`: drop the N lowest. `best`: keep the best N. `defaultMax`: max for new items. |
| `adjust` | Moves the component's score using values the student enters. `inputs`: the values to ask for. `target`: a formula over those inputs. `of`: which input is the class/section average. The average is brought into `[target − range, target + range]`; `"shift"` moves the student's score by the same amount, `"scale"` multiplies it by the same ratio. The result is capped to `0 … max`. |
| `letter` | `{ "mode": "curve" }` lets the student enter cutoffs or pick a letter. `{ "mode": "fixed", "cutoffs": { "A+": 95, "A": 90, ... } }` prefills the cutoffs (in %). |

Formulas support numbers, input names, `+ - * / ^`, parentheses and `min`, `max`, `clamp`, `abs`, `round`, `floor`, `ceil`, `sqrt`, `avg`.

## Fonts

Manrope and Source Serif 4 are under the SIL Open Font License. Thmanyah is free for personal and commercial use including web embedding, but its files must not be redistributed on their own or modified, so keep them as part of the site.
