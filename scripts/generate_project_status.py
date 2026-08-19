#!/usr/bin/env python3
"""Regenerate PROJECT_STATUS.md from .ai/project-state.json. CI entry point.

--check : fail if the committed PROJECT_STATUS.md is out of sync (used in CI).
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_state import StateError, cmd_status, find_root  # noqa: E402


class Args:
    agent = "ci"
    check = "--check" in sys.argv


def main():
    try:
        cmd_status(find_root(), Args())
    except StateError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
