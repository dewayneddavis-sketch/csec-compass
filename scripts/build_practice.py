#!/usr/bin/env python3
"""Build 100-question practice.json files for all 10 CSEC subjects.

Keeps the existing 12 questions (p1..p12) in each public/content/<subject>/
practice.json untouched, appends 88 new questions (p13..p100) authored in
scripts/practice_<subject>.py, validates, and writes the result to both
content/<subject>/ and public/content/<subject>/.
"""
import importlib.util
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SUBJECTS = {
    "mathematics": "practice_math",
    "english-a": "practice_english_a",
    "biology": "practice_biology",
    "chemistry": "practice_chemistry",
    "physics": "practice_physics",
    "information-technology": "practice_it",
    "principles-of-accounts": "practice_poa",
    "social-studies": "practice_social_studies",
    "human-social-biology": "practice_hsb",
    "spanish": "practice_spanish",
}


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, "scripts", name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    problems = []
    for subject, modname in SUBJECTS.items():
        mod = load_module(modname)
        new_qs = mod.QUESTIONS

        # Exactly 88 new questions (p13..p100)
        if len(new_qs) < 88:
            problems.append(f"{subject}: only {len(new_qs)} new questions (need 88)")
            continue
        new_qs = new_qs[:88]

        existing_path = os.path.join(ROOT, "public", "content", subject, "practice.json")
        if not os.path.exists(existing_path):
            problems.append(f"{subject}: no existing practice.json found at {existing_path}")
            continue
        with open(existing_path) as f:
            existing = json.load(f)
        existing = existing[:12]  # keep exactly p1..p12

        # Build new questions with ids p13..p100
        added = []
        for i, (question, options, ans_idx, explanation) in enumerate(new_qs):
            assert len(options) == 4, f"{subject} p{i+13}: options != 4"
            added.append({
                "id": f"p{i + 13}",
                "question": question,
                "options": options,
                "answer": options[ans_idx],
                "explanation": explanation,
            })

        all_qs = existing + added
        ids = [q["id"] for q in all_qs]
        if len(all_qs) != 100:
            problems.append(f"{subject}: final count {len(all_qs)} != 100")
            continue
        if len(set(ids)) != 100:
            problems.append(f"{subject}: duplicate ids")
            continue
        for q in all_qs:
            if q["answer"] not in q["options"]:
                problems.append(f"{subject} {q['id']}: answer not in options")
                continue

        # Write to public/content/<subject>/practice.json (served asset)
        out_public = os.path.join(ROOT, "public", "content", subject, "practice.json")
        with open(out_public, "w") as f:
            json.dump(all_qs, f, indent=2, ensure_ascii=False)
            f.write("\n")

        # Mirror to content/<subject>/practice.json if that dir exists
        src_dir = os.path.join(ROOT, "content", subject)
        if os.path.isdir(src_dir):
            out_src = os.path.join(src_dir, "practice.json")
            with open(out_src, "w") as f:
                json.dump(all_qs, f, indent=2, ensure_ascii=False)
                f.write("\n")
            print(f"{subject}: 100 questions -> public/content/{subject}/practice.json + content/{subject}/practice.json")
        else:
            print(f"{subject}: 100 questions -> public/content/{subject}/practice.json")

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("\nAll 10 subjects built successfully: 100 questions each.")


if __name__ == "__main__":
    main()
