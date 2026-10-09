# Human & Social Biology — gap lessons, rendered before/after proof

Closes the rendered-proof gap on the 7 syllabus-gap lessons added to Human & Social Biology (live on main
via #147, copy normalised to CXC British spellings via #151). **Docs only** — these PNGs, nothing else.

## The 7 lessons (new in #147)

| lesson id | lesson page (h1) | Play tab renders |
|---|---|---|
| `hsb-l1-3` | Excretion and the Kidney | match: 4 organs ↔ the waste each removes |
| `hsb-l1-4` | The Eye and the Ear | match: 5 eye/ear parts ↔ their function |
| `hsb-l1-5` | The Endocrine System | match: 4 glands ↔ hormone and effect |
| `hsb-l1-6` | Respiration and Energy Release | sort: 6 statements ↔ Aerobic / Anaerobic |
| `hsb-l3-3` | Teeth and Dental Health | match: 4 terms ↔ descriptions |
| `hsb-l3-4` | Vitamins, Minerals and Malnutrition | match: 5 nutrients ↔ deficiency disease |
| `hsb-l6-3` | Human Reproduction and Development | order: 5 stages, fertilisation → birth |

## Before / after pairs

| before | after | what it shows |
|---|---|---|
| `before-subject-page-preview-mode.png` | `after-subject-page-preview-mode.png` | the subject page's own Preview Mode line — **2 of 12** lessons → **2 of 19** |
| (lesson list inside the before frame: Body Systems = 2 lessons) | `after-subject-page-new-lessons.png` | module counts now 6 / 2 / 4 / 2 / 2 / 3 = 19, with the four Body Systems lessons listed and the honest lock badge on every lesson beyond the 2-lesson preview |
| `before-lesson-hsb-l1-3-url.png` — "Lesson not found" | `after-lesson-hsb-l1-3-excretion.png` — the real lesson | the same URL before and after the lessons existed |
| — | `after-lesson-hsb-l1-3-gated-public-view.png` | what a signed-out visitor gets for a gap lesson: "This lesson requires full access — Sign in to view the free 2-lesson preview, or unlock all 19 lessons." |
| — | `after-lesson-hsb-l1-3-excretion.png`, `after-lesson-hsb-l1-4-sense-organs.png`, `after-lesson-hsb-l1-5-endocrine.png`, `after-lesson-hsb-l1-6-respiration.png`, `after-lesson-hsb-l3-3-dental-health.png`, `after-lesson-hsb-l3-4-micronutrients.png`, `after-lesson-hsb-l6-3-reproduction.png` | each gap lesson renders as a lesson (heading, Learning Objectives, Key Concepts) |
| — | `after-play-hsb-l1-3-excretion.png`, `after-play-hsb-l1-4-sense-organs.png`, `after-play-hsb-l1-5-endocrine.png`, `after-play-hsb-l1-6-respiration.png`, `after-play-hsb-l3-3-dental-health.png`, `after-play-hsb-l3-4-micronutrients.png`, `after-play-hsb-l6-3-reproduction.png` | each Play tab renders the activity its description names, with the description box on screen |

## DOM read-back (the text that actually rendered, not just pixels)

Subject page, after: `"Preview Mode — You are viewing 2 of 19 lessons. Unlock full access to all 19 lessons!"`
and these new lesson titles present in the page text: Excretion and the Kidney · The Eye and the Ear · The
Endocrine System · Respiration and Energy Release.

Subject page, before: `"Preview Mode — You are viewing 2 of 12 lessons. Unlock full access to all 12 lessons!"`
and **none** of the 7 new titles anywhere on the page.

Gap-lesson URL, before: `"Lesson not found ← Back to Subject"` (no `h1`).

Gap-lesson URL, after, signed out: `"This lesson requires full access. Sign in to view the free 2-lesson
preview, or unlock all 19 lessons. Unlock full access ← Back to Human & Social Biology"`.

Lesson body, all 7, after: `h1` = the lesson title, `Learning Objectives` present, body text 2,565–3,163 chars.

Play tab, all 7, after. Each description was matched **exactly** against `experiment.description` in
`content/human-social-biology/modules.json` and the lab card read out of the same DOM:

- `hsb-l1-3` → "Excretion: Match each organ to the waste product it removes." over *Excretion · Match each organ of excretion to the waste it removes.* — Drag items Lungs / Kidneys / Liver / Skin ↔ 4 drop zones (carbon dioxide and water vapour · urea, excess salts and excess water as urine · water and salts lost as sweat · makes urea from excess amino acids)
- `hsb-l1-4` → "Sense Organs: Match each part of the eye or ear to its function." over *The Eye and the Ear* — Cornea / Cochlea / Retina / Iris / Lens ↔ 5 function zones
- `hsb-l1-5` → "Endocrine System: Match each gland to the hormone it produces and its effect." over *The Endocrine System* — Pancreas / Thyroid / Adrenal glands / Pituitary ↔ 4 zones
- `hsb-l1-6` → "Aerobic or Anaerobic? Sort each statement into the correct type of respiration." over the same title — 6 statements into Aerobic / Anaerobic
- `hsb-l3-3` → "Teeth and Dental Health: Match each term to its description." — Enamel / Fluoride / Plaque / Dentine ↔ 4 zones
- `hsb-l3-4` → "Micronutrients: Match each nutrient to the deficiency disease it prevents." — Vitamin A / Iron / Iodine / Vitamin D / Vitamin C ↔ Night blindness / Scurvy / Rickets / **Anaemia** / Goitre
- `hsb-l6-3` → "Human Development: Arrange the stages from fertilisation to birth in order." — 5 stages in order

Every description's verb matches what renders (Match → match, Sort → sort, Arrange → order), and the items
named in the description are the items in the activity.

## Method (so this set is reproducible)

- Content is fetched at runtime (`/content/<subject>/modules.json`), so the **before** state was rendered by
  serving a temp copy of the build with `content/human-social-biology/modules.json` restored from `c3974cb`
  (the commit before #147) — confirmed over HTTP as 12 lessons against the current 19. Temp tree deleted after
  use; no content file was touched in this branch.
- The **before/after subject-page** frames and the **gated public view** frame come from the clean build with no
  bypass — that is why the honest Preview Mode line and the lock badges are visible.
- The frames that show lesson *body content* behind the free-preview gate (the seven lesson frames and the seven
  Play frames) were captured with a throwaway local `hasSubjectAccess` bypass. It was reverted before this
  branch was committed: `grep -rc SCREENSHOT-ONLY src/` = 0 files, and this branch's diff contains no `src/` or
  `api/` change. The signed-out truth for those lessons is `after-lesson-hsb-l1-3-gated-public-view.png`.
- No marking, exam-outcome or urgency language appears in any filename or caption here: these frames document
  that content renders, not that a student will pass anything.
- An observation for someone else's task, not fixed here: `src/components/lessonSets.js` (src, not content)
  still reads "Surgical sterilization for men" in the `hsb-l6-2` set — US spelling in a file the #151 British
  normalisation pass did not cover.
