# Information Technology — Coverage (61 chapters)

Owner's target list: `/home/team/shared/information-technology-coverage-target-competitor-list.md`
(verbatim, 61 chapters across 8 sections). Formal audit: `/home/team/shared/information-technology-coverage-audit.md`.
Machine-checked by `tools/check-information-technology-coverage.mjs` — this table is parsed by that harness, so
the columns below are a contract, not decoration.

**Headline: 61 chapters = REUSE 7 + EXTEND 31 + NEW 23** against the 12 frozen lessons `it-l1-1`…`it-l6-2`
in 6 modules. End state: **35 lessons** (12 frozen + 23 NEW). Chapter identity is always the pair
`(section, number)` — never the chapter name, because "Variables, Constants, and Data Types" is two
different chapters (#52 conceptual, #59 syntactic) and "Data Types" appears a third time inside #46.

## Column contract

| column | meaning |
|---|---|
| `S` / `#` | section number (1–8) and chapter number (1–61, in order) |
| `chapter` | the owner's chapter name, verbatim |
| `disp` | `NEW` (a new lesson), `EXTEND` (grown inside an existing lesson), `REUSE` (already taught) |
| `state` | `taught` = the host lesson teaches this chapter **by name** today; `paraphrase` = a REUSE chapter taught under different words, with the words recorded; `pending` = the build for this chapter is a later slice |
| `lesson id` | the lesson that teaches (or will teach) it. Existing ids are identity: never renamed, re-keyed or split |
| `evidence phrase` | a phrase that **must** appear in that lesson's own copy (title/content/objectives/concepts). For `NEW`/`EXTEND` it must contain the chapter name, so coverage is provable **by name**. `-` for `pending` rows, which are not taught yet |

## Build slices (one branch + one PR each, cut by HOST-LESSON OWNERSHIP, never by section)

Chapter #12 (S1) and #45–47 (S6) all grow the single-line content of `it-l3-1`, so a section-based cut would
guarantee a merge conflict. **#12 executes in slice D.** Two contention surfaces: the end of the
`lessonSets["information-technology"]` block (each slice appends sibling keys verbatim and never reorders —
this harness keeps an `EXPECTED_IDS` union plus a `PENDING_IDS` list so a lost block goes red) and
`modules.json` module objects (disjoint across slices, append-only, so composition is clean).

| slice | chapters | NEW | EXTEND (host) | REUSE | extra files |
|---|---|---|---|---|---|
| **0** lab-type honesty | – | – | – | – | modules.json |
| **A** S1 fundamentals | 1–11, 13 (12; #12→D) | 9 `fund-` | `it-l1-1` (#3, #5, #6) | 0 | modules.json, lessonSets.js, this doc, the coverage harness |
| **B** S4+S5 office | 24–44 (21) | 6 (`wp-`×2, `web-`×2, `sheet-`×2) | `it-l6-1` (#24, #25, #26, #27, #29), `it-l6-2` (#37, #39, #40, #42, #43) | 5 | modules.json, lessonSets.js, this doc, the coverage harness |
| **C** S2+S3 networks/impact | 14–23 (10) | 5 (`net-`×2, `imp-`×3) | `it-l4-1` (#14, #15), `it-l4-2` (#18, #19, #20) | 0 | modules.json, NEW `it-mod-7`, metadata.json, lessonSets.js |
| **D** S6+S7+S8 (+ orphan) | 12, 45–61 (14) | 3 `impl-` | `it-l3-1` (#12, #45, #46, #47), `it-l2-1` (#49, #50, #51, #53, #55), `it-l2-2` (#52, #57, #58, #60) | 2 | modules.json, lessonSets.js |

Totals: 12 + 21 + 10 + 18 = 61 · NEW 9 + 6 + 5 + 3 = 23 · EXTEND 3 + 10 + 5 + 13 = 31 · REUSE 0 + 5 + 0 + 2 = 7.

#40 Formula Replication was upgraded from REUSE to EXTEND on the lead's decision (F1, 2026-11-05): one
clause about relative vs absolute referencing, with no worked copy, is not coverage.

Target module shape (7 modules, 35 lessons): `it-mod-1` Computer Fundamentals 2 → **11** (the 9 `fund-`);
`it-mod-2` Programming 2 → 5; `it-mod-3` Databases 2 (unchanged); `it-mod-4` Networking & Internet 2 → 4;
`it-mod-5` Web Technology 2 → 4; `it-mod-6` Word Processing & Spreadsheets 2 → 6; `it-mod-7`
Social/Economic Impact of ICT (new) 0 → 3. New lessons are APPENDED inside their module, never before an
existing lesson. `metadata.json estimatedModules` 6 → 7 happens in slice C.

## State of this branch: Slice 0 + Slice A + Slice B landed

- **Slice 0** — the 12 existing lessons now declare the lab type their own description describes. Nine of
  them claimed `code-playground`; only `it-l2-2` (write and run code) and `it-l5-1` (edit HTML code) actually
  describe writing code. `it-l1-1` keeps `drag-drop`, `it-l4-2` keeps `simulation`.
- **Slice A** — 9 NEW `fund-` lessons in `it-mod-1` (2 → 11 lessons) and 3 EXTEND chapters grown in place on
  the frozen `it-l1-1` (pure insertion: the original opening and every original objective/concept remain).
- **Slice B** — 6 NEW office-tool lessons (`it-mod-5` 2 → 4, `it-mod-6` 2 → 6) and 10 EXTEND chapters grown
  in place on the two frozen hosts `it-l6-1` (#24, #25, #26, #27, #29) and `it-l6-2` (#37, #39, #40, #42,
  #43). Both are pure insertions: the old `content` is the prefix of the new, and every original concept
  survives in its original position. The slice closes three pre-existing honesty gaps — **MIN / MAX / COUNT**
  are now taught by name in #39 (they existed only in the lab deck), **Pivot Tables** are taught in #42 (they
  were a host concept with no teaching), and **Headers and Footers** and **Find and Replace** are named in
  #26 (they existed only as lab-deck pairs).
- **Not yet landed:** the 8 NEW ids of slices C and D — `net-mobile-communication-importance`,
  `net-web-technologies`, `imp-ict-and-employment`, `imp-computer-related-professions`,
  `imp-societal-and-economic-impact`, `impl-programming-language-overview`,
  `impl-variables-constants-and-data-types`, `impl-program-documentation`. The harness lists them as
  `PENDING_IDS` and fails the moment one is landed without the list shrinking.
- **Frozen in this PR:** `practice.json` (100) and `knowledge-check.json` (25). The bank re-balance is a
  separate single-owner pass after the slices, to a 5-group mapping keyed by lesson id.

### The REUSE rows — what the host lesson actually says

A `REUSE` row claims the legacy lesson already teaches the chapter. These are the words it uses. Two rows
stay `paraphrase` because the chapter name never appears in the host: #33 lives in the frozen `it-l5-1`,
which this slice does not touch, and #36 is taught under different words ("purpose" is never written).
#30 and #38 were `paraphrase` before this slice and become `taught` because the extensions on `it-l6-1`
and `it-l6-2` name them — **Mail Merge Feature** in the #29 extension and **Basic System Functions** in the
#39 extension — while the original teaching sentence is left exactly as it was.

| # | chapter | host | label | the words the lesson uses |
|---|---|---|---|---|
| 30 | Mail Merge Feature | `it-l6-1` | by-name | "Mail Merge," which allows you to create personalised letters or labels for a large group of people by linking a document to a data source — named again in the #29 extension as the Mail Merge Feature |
| 33 | Simple Web Page Design | `it-l5-1` | by-name (paraphrase row) | "write clean, valid HTML code to build simple webpages" |
| 34 | Hyperlinks | `it-l5-1` | by-name | **two phrases**, both in `it-l5-1`: "<a> for hyperlinks (which link to other pages)" and "the 'href' attribute for links" |
| 36 | Spreadsheet Purpose | `it-l6-2` | paraphrase | "Spreadsheets are powerful tools for organising, analysing, and visualising numerical data." — the word "purpose" never appears |
| 38 | Basic System Functions | `it-l6-2` | by-name | "Functions are built-in formulas… such as SUM, AVERAGE, IF…, and VLOOKUP"; MIN / MAX / COUNT were in the lab deck only and are now taught in the #39 extension |

### Slice 0 — honest lab types

| lesson | was | now | why |
|---|---|---|---|
| `it-l1-2` | code-playground | visual-converter | a binary converter that toggles bits — you do not write code |
| `it-l2-1` | drag-drop | flowchart-builder | assembling a flowchart from symbols |
| `it-l3-1` | code-playground | schema-designer | defining tables and linking them |
| `it-l3-2` | code-playground | drag-drop | drag fields and criteria to build a query |
| `it-l4-1` | code-playground | network-topology | connecting devices into topologies |
| `it-l5-2` | code-playground | web-builder | a CSS panel that restyles a template page |
| `it-l6-1` | code-playground | simulation | a mail-merge simulator |
| `it-l6-2` | code-playground | visual-converter | a budget visualiser with charts |
| `it-l2-2` | code-playground | **kept** | it really does describe writing and running code |
| `it-l5-1` | code-playground | **kept** | it really does describe editing HTML code |
| `it-l1-1` | drag-drop | **kept** | dragging components onto a motherboard |
| `it-l4-2` | simulation | **kept** | reviewing simulated configurations |

## The 61-row conformance table

| S | # | chapter | disp | state | lesson id | evidence phrase |
|---|---|---|---|---|---|---|
| 1 | 1 | Information Technology Concept | NEW | taught | fund-information-technology-concept | the information technology concept is simple to state |
| 1 | 2 | Computer System Types | NEW | taught | fund-computer-system-types | computer system types are classified by size |
| 1 | 3 | Hardware Components and IPOS Cycle | EXTEND | taught | it-l1-1 | hardware components and ipos cycle every computer, from a phone to a mainframe, carries out the same four steps |
| 1 | 4 | Cloud and Local Storage | NEW | taught | fund-cloud-and-local-storage | cloud and local storage are the two places |
| 1 | 5 | Input/Output Devices | EXTEND | taught | it-l1-1 | input/output devices input devices bring data into the system and output devices take results out of it |
| 1 | 6 | Software Types and Roles | EXTEND | taught | it-l1-1 | software types and roles software is the set of instructions that makes the hardware do something |
| 1 | 7 | User Interface Types | NEW | taught | fund-user-interface-types | user interface types differ in how much the user has to remember and how much the machine shows |
| 1 | 8 | System Suitability and Specification | NEW | taught | fund-system-suitability-and-specification | system suitability and specification is the part of it that stops people wasting money |
| 1 | 9 | Basic Hardware Troubleshooting | NEW | taught | fund-basic-hardware-troubleshooting | basic hardware troubleshooting is a method, not a guess |
| 1 | 10 | Data and Information Distinction | NEW | taught | fund-data-and-information-distinction | the data and information distinction is one of the most examined ideas |
| 1 | 11 | Online Information Reliability | NEW | taught | fund-online-information-reliability | online information reliability is the skill of deciding whether a page |
| 1 | 12 | Data Validation and Verification | EXTEND | pending | it-l3-1 | - |
| 1 | 13 | File Organization | NEW | taught | fund-file-organisation | file organisation is how you arrange stored work |
| 2 | 14 | Network Types and Wireless Technologies | EXTEND | pending | it-l4-1 | - |
| 2 | 15 | Network Components and Functions | EXTEND | pending | it-l4-1 | - |
| 2 | 16 | Mobile Communication Importance | NEW | pending | net-mobile-communication-importance | - |
| 2 | 17 | Web Technologies | NEW | pending | net-web-technologies | - |
| 3 | 18 | Computer Security and Misuse Concepts | EXTEND | pending | it-l4-2 | - |
| 3 | 19 | Impact of Computer Systems Misuse | EXTEND | pending | it-l4-2 | - |
| 3 | 20 | Countermeasures and Security Practices | EXTEND | pending | it-l4-2 | - |
| 3 | 21 | ICT and Employment | NEW | pending | imp-ict-and-employment | - |
| 3 | 22 | Computer-Related Professions | NEW | pending | imp-computer-related-professions | - |
| 3 | 23 | Societal and Economic Impact of ICT | NEW | pending | imp-societal-and-economic-impact | - |
| 4 | 24 | Document Creation and Content Integration | EXTEND | taught | it-l6-1 | document creation and content integration decides how a document begins and how the material inside it stays connected |
| 4 | 25 | Document Formatting Features | EXTEND | taught | it-l6-1 | document formatting features divide into three layers |
| 4 | 26 | Document Editing and Structural Organization | EXTEND | taught | it-l6-1 | document editing and structural organisation is where a long document is broken into parts that behave differently |
| 4 | 27 | Document Review Features | EXTEND | taught | it-l6-1 | document review features are the tools that let one document pass between several people without losing the thread |
| 4 | 28 | Document Protection Features | NEW | taught | wp-document-protection-features | document protection features are the settings that decide who may open a file and what may be changed once it is open |
| 4 | 29 | Table of Contents Generation | EXTEND | taught | it-l6-1 | table of contents generation is automatic, not typed |
| 4 | 30 | Mail Merge Feature | REUSE | taught | it-l6-1 | the mail merge feature is the other automation this lesson already teaches |
| 4 | 31 | Fillable Electronic Forms | NEW | taught | wp-fillable-electronic-forms | fillable electronic forms are documents built so that a person can type into the blanks and nowhere else |
| 4 | 32 | Website Structure and Organization | NEW | taught | web-website-structure-and-organisation | website structure and organisation is the planning that happens before a single page is written |
| 4 | 33 | Simple Web Page Design | REUSE | paraphrase | it-l5-1 | write clean, valid html code to build simple webpages |
| 4 | 34 | Hyperlinks | REUSE | taught | it-l5-1 | for hyperlinks (which link to other pages) |
| 4 | 35 | Website Evaluation and Publishing | NEW | taught | web-website-evaluation-and-publishing | website evaluation and publishing are the last two jobs on a site |
| 5 | 36 | Spreadsheet Purpose | REUSE | paraphrase | it-l6-2 | organising, analysing, and visualising numerical data |
| 5 | 37 | Spreadsheet Terminology | EXTEND | taught | it-l6-2 | spreadsheet terminology starts with the grid |
| 5 | 38 | Basic System Functions | REUSE | taught | it-l6-2 | the basic system functions of sum and average are where all of this starts |
| 5 | 39 | Advanced Arithmetic Formulae | EXTEND | taught | it-l6-2 | advanced arithmetic formulae are built from the same operators in a fixed order |
| 5 | 40 | Formula Replication | EXTEND | taught | it-l6-2 | formula replication is what happens when a formula is copied |
| 5 | 41 | Column and Row Manipulation | NEW | taught | sheet-column-and-row-manipulation | column and row manipulation is how a sheet is edited after the data is in it |
| 5 | 42 | Data Manipulation | EXTEND | taught | it-l6-2 | data manipulation is the set of operations that turns a long list into an answer without retyping it |
| 5 | 43 | Charting Operations | EXTEND | taught | it-l6-2 | charting operations are a sequence of choices, not a single button |
| 5 | 44 | Worksheet Management | NEW | taught | sheet-worksheet-management | worksheet management is about the tabs along the bottom of the window |
| 6 | 45 | Database Concepts | EXTEND | pending | it-l3-1 | - |
| 6 | 46 | Database Terminology and Data Types | EXTEND | pending | it-l3-1 | - |
| 6 | 47 | Database Creation and Structure | EXTEND | pending | it-l3-1 | - |
| 6 | 48 | Data Manipulation and Reporting | REUSE | paraphrase | it-l3-2 | reports are used to present the results of a query |
| 7 | 49 | Problem-Solving Steps | EXTEND | pending | it-l2-1 | - |
| 7 | 50 | Divide-and-Conquer Approach | EXTEND | pending | it-l2-1 | - |
| 7 | 51 | Problem Components and IPO Chart | EXTEND | pending | it-l2-1 | - |
| 7 | 52 | Variables, Constants, and Data Types | EXTEND | pending | it-l2-2 | - |
| 7 | 53 | Algorithm Concepts and Characteristics | EXTEND | pending | it-l2-1 | - |
| 7 | 54 | Algorithm Representation: Flowcharts and Pseudocode | REUSE | paraphrase | it-l2-1 | represent algorithms using two main tools |
| 7 | 55 | Algorithm Testing and Trace Tables | EXTEND | pending | it-l2-1 | - |
| 8 | 56 | Programming Language Overview | NEW | pending | impl-programming-language-overview | - |
| 8 | 57 | Program Implementation Steps | EXTEND | pending | it-l2-2 | - |
| 8 | 58 | Program Testing and Debugging | EXTEND | pending | it-l2-2 | - |
| 8 | 59 | Variables, Constants, and Data Types | NEW | pending | impl-variables-constants-and-data-types | - |
| 8 | 60 | Algorithmic Statements Syntax | EXTEND | pending | it-l2-2 | - |
| 8 | 61 | Program Documentation | NEW | pending | impl-program-documentation | - |

## Section counts and the module each section lives in

| section | chapters | allowed module(s) |
|---|---|---|
| 1 Computer Fundamentals and Information Processing | 13 | `it-mod-1` |
| 2 Computer Networks and Web Technologies | 4 | `it-mod-4` |
| 3 Social and Economic Impact of ICT | 6 | `it-mod-7` |
| 4 Word-Processing and Web Page Design | 12 | `it-mod-5`, `it-mod-6` |
| 5 Spreadsheets | 9 | `it-mod-6` |
| 6 Database Management | 4 | `it-mod-3` |
| 7 Problem-Solving and Program Design | 7 | `it-mod-2` |
| 8 Program Implementation | 6 | `it-mod-2` |

**Four chapters are hosted outside their own section's module, on purpose** (cut by host-lesson ownership):

| chapter | host | reason |
|---|---|---|
| #12 | `it-l3-1` (`it-mod-3`) | `it-l3-1` already teaches field validation, so chapter 12 grows there instead of in a fundamentals lesson. |
| #18 | `it-l4-2` (`it-mod-4`) | `it-l4-2` already teaches malware, phishing and antivirus, so the security-concepts chapter grows there. |
| #19 | `it-l4-2` (`it-mod-4`) | `it-l4-2` already discusses the social impact of IT misuse, so the impact chapter grows in the same lesson. |
| #20 | `it-l4-2` (`it-mod-4`) | `it-l4-2` already teaches firewalls, encryption and antivirus, so the countermeasures chapter grows there. |

## Lessons that must NOT be re-keyed into a chapter

`it-l1-2` (Data Representation — binary, hexadecimal, ASCII, bytes) and `it-l5-2` (Styling & Interactivity —
CSS, JavaScript, styling) are protected: no chapter in the 61-row table maps to them, and they must keep
teaching their own topic. They exist in the syllabus and in the bank, and an id is identity.

## Bank grouping (later single-owner re-balance, keyed by lesson id — never module id)

`it-mod-6` splits across two groups, so groups are built from lesson ids:

- **G1 Fundamentals & data** = S1 = `it-mod-1` (11 lessons)
- **G2 Networks & ICT impact** = S2 + S3 = `it-mod-4` + `it-mod-7` (7)
- **G3 Web & word-processing** = `it-mod-5` (4) + `it-mod-6` word-processing half (3) (7)
- **G4 Spreadsheets & databases** = `it-mod-6` spreadsheet half (3) + `it-mod-3` (2) (5)
- **G5 Design & program implementation** = `it-mod-2` (5)

Every group has at least 5 lessons, so "5 questions per group, 5 distinct topics" holds exactly. Measured
baseline before the re-balance: 43 of the 100 practice questions sit on `it-l1-1` (23) + `it-l4-2` (20), and
44% of the knowledge check sits on the same two lessons.
