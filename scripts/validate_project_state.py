#!/usr/bin/env python3
"""Validate .ai/project-state.json against its schema. CI entry point."""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_state import StateError, cmd_validate, find_root  # noqa: E402


class Args:
    agent = "ci"


def main():
    try:
        cmd_validate(find_root(), Args())
    except StateError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
