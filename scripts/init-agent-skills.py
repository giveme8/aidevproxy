#!/usr/bin/env python3
"""
Initialize Claude Code / Codex compatible skills from the canonical `skills/` directory.

Single source of truth:

  skills/<skill-name>/SKILL.md

Generated outputs:

  .claude/skills/<skill-name>/Skill.md
  .agents/skills/<skill-name>/Skill.md

Why this exists:

- The repository keeps human-readable skill docs in `skills/`.
- Claude Code and Codex may expect tool-specific skill locations / file names.
- To avoid maintaining multiple copies manually, run this script after editing `skills/`.

Usage:

  python scripts/init-agent-skills.py

Options:

  python scripts/init-agent-skills.py --check
  python scripts/init-agent-skills.py --clean
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CANONICAL_SKILLS_DIR = ROOT / "skills"
CLAUDE_SKILLS_DIR = ROOT / ".claude" / "skills"
AGENTS_SKILLS_DIR = ROOT / ".agents" / "skills"

GENERATED_HEADER = """<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.

Source: skills/{skill_name}/SKILL.md

Regenerate with:

  python scripts/init-agent-skills.py
-->
"""


def slug_to_title(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def extract_title(markdown: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", markdown, flags=re.MULTILINE)
    return match.group(1).strip() if match else slug_to_title(fallback)


def extract_purpose(markdown: str) -> str | None:
    """
    Try to extract a concise description from the Purpose section.
    """
    patterns = [
        r"^##\s+Purpose\s*\n+(.+?)(?:\n##\s+|\Z)",
        r"^##\s+目的\s*\n+(.+?)(?:\n##\s+|\Z)",
    ]

    for pattern in patterns:
        match = re.search(pattern, markdown, flags=re.MULTILINE | re.DOTALL)
        if match:
            raw = match.group(1).strip()
            lines = [
                re.sub(r"^[\-*]\s+", "", line).strip()
                for line in raw.splitlines()
                if line.strip()
            ]
            if lines:
                text = " ".join(lines)
                text = re.sub(r"\s+", " ", text)
                return text[:220]

    return None


def default_description(skill_name: str, title: str) -> str:
    return f"Use this skill for {title.lower()} tasks in the AI client engineering workflow."


def has_frontmatter(markdown: str) -> bool:
    return markdown.startswith("---\n")


def strip_frontmatter(markdown: str) -> str:
    if not has_frontmatter(markdown):
        return markdown

    end = markdown.find("\n---\n", 4)
    if end == -1:
        return markdown

    return markdown[end + len("\n---\n"):].lstrip()


def build_skill_md(skill_name: str, canonical_markdown: str) -> str:
    body = strip_frontmatter(canonical_markdown).strip()

    title = extract_title(body, skill_name)
    description = extract_purpose(body) or default_description(skill_name, title)
    description = description.replace('"', "'")

    frontmatter = f"""---
name: {skill_name}
description: "{description}"
---
"""

    return (
        GENERATED_HEADER.format(skill_name=skill_name).strip()
        + "\n\n"
        + frontmatter.strip()
        + "\n\n"
        + body
        + "\n"
    )


def file_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def write_if_changed(path: Path, content: str, check: bool) -> bool:
    old = path.read_text(encoding="utf-8") if path.exists() else None

    if old == content:
        return False

    if check:
        print(f"OUTDATED: {path.relative_to(ROOT)}")
        return True

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"WROTE: {path.relative_to(ROOT)}")
    return True


def find_canonical_skills() -> list[Path]:
    if not CANONICAL_SKILLS_DIR.exists():
        raise SystemExit("Missing canonical skills directory: skills/")

    skills = []

    for skill_dir in sorted(CANONICAL_SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue

        canonical = skill_dir / "SKILL.md"
        if canonical.exists():
            skills.append(canonical)

    return skills


def clean_generated_dirs() -> None:
    for path in [CLAUDE_SKILLS_DIR, AGENTS_SKILLS_DIR]:
        if path.exists():
            shutil.rmtree(path)
            print(f"REMOVED: {path.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Do not write files; fail if generated skills are out of date.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove generated .claude/skills and .agents/skills before generating.",
    )
    args = parser.parse_args()

    if args.clean and not args.check:
        clean_generated_dirs()

    canonical_skills = find_canonical_skills()

    if not canonical_skills:
        print("No canonical skills found under skills/*/SKILL.md")
        return 1

    changed = False

    for canonical in canonical_skills:
        skill_name = canonical.parent.name
        canonical_markdown = canonical.read_text(encoding="utf-8")
        generated = build_skill_md(skill_name, canonical_markdown)

        targets = [
            CLAUDE_SKILLS_DIR / skill_name / "Skill.md",
            AGENTS_SKILLS_DIR / skill_name / "Skill.md",
        ]

        for target in targets:
            if write_if_changed(target, generated, args.check):
                changed = True

    if args.check and changed:
        print("\nGenerated skill files are out of date.")
        print("Run: python scripts/init-agent-skills.py")
        return 1

    if args.check:
        print("Generated skill files are up to date.")
    else:
        print("\nAgent skills initialized.")
        print("Canonical source: skills/*/SKILL.md")
        print("Generated:")
        print("  .claude/skills/*/Skill.md")
        print("  .agents/skills/*/Skill.md")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
