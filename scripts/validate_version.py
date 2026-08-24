#!/usr/bin/env python3
"""Validate synchronized App and Node package versions."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "opendisplay_studio_renderer"


def main() -> int:
    """Validate all version-bearing files and an optional release tag."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag")
    args = parser.parse_args()
    config = yaml.safe_load((APP / "config.yaml").read_text("utf-8"))
    version = str(config["version"])
    package = json.loads((APP / "rootfs/app/package.json").read_text("utf-8"))
    expected = {
        "Node package": str(package["version"]),
        "git tag": args.tag.removeprefix("v") if args.tag else version,
    }
    errors = [
        f"{name} is {value}, expected {version}"
        for name, value in expected.items()
        if value != version
    ]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Version {version} is synchronized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
