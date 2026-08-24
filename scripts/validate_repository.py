#!/usr/bin/env python3
"""Validate repository metadata not covered by the Home Assistant App linter."""

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "opendisplay_studio_renderer"


def main() -> None:
    """Validate stable repository and App identifiers."""
    repository = yaml.safe_load((ROOT / "repository.yaml").read_text("utf-8"))
    assert repository == {
        "name": "OpenDisplay Studio Apps",
        "url": "https://github.com/Misiu/OpenDisplay-Studio-App",
        "maintainer": "Misiu",
    }
    config = yaml.safe_load((APP / "config.yaml").read_text("utf-8"))
    assert config["slug"] == "opendisplay_studio_renderer"
    assert config["arch"] == ["amd64", "aarch64"]
    assert config["image"] == "ghcr.io/misiu/opendisplay-studio-renderer"
    assert config["options"]["pool_size"] == 2
    print("Repository metadata is valid.")


if __name__ == "__main__":
    main()
