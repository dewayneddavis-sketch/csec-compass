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
| **D** S6+S7+S8 (+ orphan) | 12, 45–61 (18) | 3 `impl-` | `it-l3-1` (#12, #45, #46, #47), `it-l2-1` (#49, #50, #51, #53, #55), `it-l2-2` (#52, #57, #58, #60) | 2 | modules.json, lessonSets.js, this doc, the coverage harness |

Totals: 12 + 21 + 10 + 18 = 61 · NEW 9 + 6 + 5 + 3 = 23 · EXTEND 3 + 10 + 5 + 13 = 31 · REUSE 0 + 5 + 0 + 2 = 7.

#40 Formula Replication was upgraded from REUSE to EXTEND on the lead's decision (F1, 2026-11-05): one
clause about relative vs absolute referencing, with no worked copy, is not coverage.

Target module shape (7 modules, 35 lessons): `it-mod-1` Computer Fundamentals 2 → **11** (the 9 `fund-`);
`it-mod-2` Programming 2 → 5; `it-mod-3` Databases 2 (unchanged); `it-mod-4` Networking & Internet 2 → 4;
`it-mod-5` Web Technology 2 → 4; `it-mod-6` Word Processing & Spreadsheets 2 → 6; `it-mod-7`
Social/Economic Impact of ICT (new) 0 → 3. New lessons are APPENDED inside their module, never before an
existing lesson. `metadata.json estimatedModules` 6 → 7 happens in slice C.

**Slice C creates exactly ONE new module.** The five new lessons are drawn from two syllabus sections, but
they do not share a home: the two `net-` lessons are Section 2 chapters and belong to the existing
`it-mod-4` Networking & Internet (2 → 4), which is what `ALLOWED_MODULES[2]` in the harness asserts; only
the three `imp-` lessons are Section 3 and open the new `it-mod-7` (0 → 3). So `estimatedModules` goes
6 → 7, not 6 → 8 — one module is created, and `it-mod-4` merely grows.

## State of this branch: Slice 0 + Slice A + Slice B + Slice C + Slice D landed

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
- **Not yet landed:** nothing. All 23 NEW ids are in the tree and the harness's `PENDING_IDS` is empty.
- **Slice C** — 5 NEW lessons and 10 chapters closed. Two `net-` lessons are APPENDED to the existing
  `it-mod-4` Networking & Internet (2 → 4): `net-mobile-communication-importance` (#16) and
  `net-web-technologies` (#17). One new module `it-mod-7` Social/Economic Impact of ICT opens with the three
  `imp-` lessons: `imp-ict-and-employment` (#21), `imp-computer-related-professions` (#22),
  `imp-societal-and-economic-impact` (#23). Five EXTEND chapters grow in place on the two frozen hosts
  `it-l4-1` (#14 Network Types and Wireless Technologies, #15 Network Components and Functions) and
  `it-l4-2` (#18 Computer Security and Misuse Concepts, #19 Impact of Computer Systems Misuse,
  #20 Countermeasures and Security Practices). Both hosts are pure insertions: the original `content` is an
  exact prefix of the new, and every original concept survives in its original position at the front of the
  array. `metadata.json estimatedModules` moves 6 → 7 and now equals the real module count (7).
- **Slice D** — the last coverage slice: 35 lessons / 7 modules, `PENDING_IDS` empty. 3 NEW `impl-`
  lessons (`impl-programming-language-overview` #56, `impl-variables-constants-and-data-types` #59,
  `impl-program-documentation` #61) are APPENDED to the **existing** `it-mod-2` Programming (2 → 5, in
  chapter order after `it-l2-2`); **no `it-mod-8` is created** and `metadata.json estimatedModules` stays
  **7**. 13 EXTEND chapters grow in place on three frozen hosts — `it-l3-1` (#45, #46, #47 and the orphan
  #12), `it-l2-1` (#49, #50, #51, #53, #55) and `it-l2-2` (#52, #57, #58, #60) — each a pure insertion: the
  original `content` is an exact prefix of the new and every original concept keeps its position at the
  front of the array (the prefixes are 4, 5 and 4 long, and the harness derives each length rather than
  assuming one). The slice also closes the five places where a frozen lab deck or a bank question tested a
  fact the lesson never taught: **Modulus** and the five arithmetic operators, the **assignment statement**
  and **function/subprogram** in `it-l2-2`; the **parallelogram** and **arrow** flowchart symbols in
  `it-l2-1`; and **form** and **report** as database objects in `it-l3-1`. They are closed by teaching,
  never by editing the deck or the bank.
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
| 1 | 12 | Data Validation and Verification | EXTEND | taught | it-l3-1 | data validation and verification are two different checks |
| 1 | 13 | File Organization | NEW | taught | fund-file-organisation | file organisation is how you arrange stored work |
| 2 | 14 | Network Types and Wireless Technologies | EXTEND | taught | it-l4-1 | network types and wireless technologies is the second half of the classification |
| 2 | 15 | Network Components and Functions | EXTEND | taught | it-l4-1 | network components and functions are the parts you can point at |
| 2 | 16 | Mobile Communication Importance | NEW | taught | net-mobile-communication-importance | mobile communication importance is best understood by looking at what a phone replaced |
| 2 | 17 | Web Technologies | NEW | taught | net-web-technologies | web technologies is the umbrella name for the standards and languages that make a page work inside a browser |
| 3 | 18 | Computer Security and Misuse Concepts | EXTEND | taught | it-l4-2 | computer security and misuse concepts are the vocabulary the rest of this section depends on |
| 3 | 19 | Impact of Computer Systems Misuse | EXTEND | taught | it-l4-2 | the impact of computer systems misuse is measured in three currencies |
| 3 | 20 | Countermeasures and Security Practices | EXTEND | taught | it-l4-2 | countermeasures and security practices are the controls you put in place |
| 3 | 21 | ICT and Employment | NEW | taught | imp-ict-and-employment | ict and employment is about the way computer systems have changed which jobs exist |
| 3 | 22 | Computer-Related Professions | NEW | taught | imp-computer-related-professions | computer-related professions is the name for the jobs whose whole day is spent building, running or supporting computer systems |
| 3 | 23 | Societal and Economic Impact of ICT | NEW | taught | imp-societal-and-economic-impact | societal and economic impact of ict is the account of what changes when a country's businesses, schools and government services all move onto computers |
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
| 6 | 45 | Database Concepts | EXTEND | taught | it-l3-1 | database concepts begin with what a database is |
| 6 | 46 | Database Terminology and Data Types | EXTEND | taught | it-l3-1 | database terminology and data types are the vocabulary |
| 6 | 47 | Database Creation and Structure | EXTEND | taught | it-l3-1 | database creation and structure is the order of steps |
| 6 | 48 | Data Manipulation and Reporting | REUSE | paraphrase | it-l3-2 | reports are used to present the results of a query |
| 7 | 49 | Problem-Solving Steps | EXTEND | taught | it-l2-1 | problem-solving steps are the six stages |
| 7 | 50 | Divide-and-Conquer Approach | EXTEND | taught | it-l2-1 | the divide-and-conquer approach breaks a large problem into smaller parts |
| 7 | 51 | Problem Components and IPO Chart | EXTEND | taught | it-l2-1 | problem components and ipo chart name the inputs, the processes and the outputs |
| 7 | 52 | Variables, Constants, and Data Types | EXTEND | taught | it-l2-2 | variables, constants, and data types are the conceptual question |
| 7 | 53 | Algorithm Concepts and Characteristics | EXTEND | taught | it-l2-1 | algorithm concepts and characteristics are the definition plus the five tests |
| 7 | 54 | Algorithm Representation: Flowcharts and Pseudocode | REUSE | paraphrase | it-l2-1 | represent algorithms using two main tools |
| 7 | 55 | Algorithm Testing and Trace Tables | EXTEND | taught | it-l2-1 | algorithm testing and trace tables prove an algorithm works |
| 8 | 56 | Programming Language Overview | NEW | taught | impl-programming-language-overview | programming language overview is the map of the languages a programmer can choose from |
| 8 | 57 | Program Implementation Steps | EXTEND | taught | it-l2-2 | program implementation steps run from the finished design |
| 8 | 58 | Program Testing and Debugging | EXTEND | taught | it-l2-2 | program testing and debugging are two different jobs |
| 8 | 59 | Variables, Constants, and Data Types | NEW | taught | impl-variables-constants-and-data-types | variables, constants, and data types are the three declarations every program is built from |
| 8 | 60 | Algorithmic Statements Syntax | EXTEND | taught | it-l2-2 | algorithmic statements syntax is the small set of statement forms |
| 8 | 61 | Program Documentation | NEW | taught | impl-program-documentation | program documentation is the written record that lets the next person read, run and repair the program |

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
