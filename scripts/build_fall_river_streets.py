#!/usr/bin/env python3
"""Build an app-ready Fall River street list from an official GeoJSON export.

Expected workflow:
1) Export official roads as GeoJSON (MassGIS Road Centerlines preferred).
2) Run this script against that file.
3) Use generated JSON in the app for search/autocomplete.
"""

import argparse
import json
import re
from pathlib import Path


def normalize_name(name: str) -> str:
    text = re.sub(r"[^A-Z0-9 ]+", "", name.upper()).strip()
    return re.sub(r"\s+", " ", text)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input roads GeoJSON file")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument(
        "--municipality-field",
        default="MUNICIPALITY",
        help="Feature property name containing municipality/city",
    )
    parser.add_argument(
        "--street-field",
        default="STREETNAME",
        help="Feature property name containing street display name",
    )
    parser.add_argument(
        "--municipality-match",
        default="FALL RIVER",
        help="Case-insensitive municipality filter",
    )
    parser.add_argument(
        "--source",
        default="MassGIS Road Centerlines",
        help="Human-readable source name",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    payload = json.loads(input_path.read_text())
    features = payload.get("features", [])

    wanted_city = args.municipality_match.upper().strip()
    streets = {}

    for feature in features:
        props = feature.get("properties", {})
        municipality = str(props.get(args.municipality_field, "")).upper().strip()
        if municipality != wanted_city:
            continue

        street_display = str(props.get(args.street_field, "")).strip()
        if not street_display:
            continue

        street_normalized = normalize_name(street_display)
        if not street_normalized:
            continue

        if street_normalized not in streets:
            streets[street_normalized] = {
                "municipality": "Fall River",
                "street_name_display": street_display,
                "street_name_normalized": street_normalized,
            }

    rows = sorted(streets.values(), key=lambda item: item["street_name_display"])
    output = {
        "source": args.source,
        "municipality": "Fall River",
        "street_count": len(rows),
        "streets": rows,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2) + "\n")

    print(f"Wrote {len(rows)} streets to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
