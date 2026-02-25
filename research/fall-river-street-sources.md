# Fall River, MA street list: official-source shortlist

For the plowing-vote app, we need a canonical list of street names to power search/autocomplete and to normalize user votes.

## Recommended authoritative source (state official)

1. **MassGIS Road Centerlines** (Commonwealth of Massachusetts, Executive Office of Technology Services and Security).
   - Landing page: https://www.mass.gov/info-details/massgis-data-road-centerlines
   - Why this is strong:
     - Official Massachusetts government geospatial dataset.
     - Statewide and maintained for emergency/public-works style use cases.
     - Includes municipal attribution so we can filter to `Fall River` and derive distinct street names.

## City-level source to verify next

2. **City of Fall River GIS / Assessors street index** (if published as a downloadable street table).
   - Candidate city portal: https://www.fallriverma.gov/
   - If a direct street index export exists, treat city-published records as the highest-priority naming standard.

## Backup official source

3. **US Census Bureau TIGER/Line roads** (federal official source).
   - Landing page: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
   - Useful as a backup baseline, but for local operations in Massachusetts we should prefer MassGIS or city GIS naming where available.

## Normalization rules for the app

When we ingest the official source, keep:
- `street_name_display` (human-facing name, e.g. "Pleasant St")
- `street_name_normalized` (uppercase, punctuation-stripped form for search)
- optional `street_suffix`, `predir`, `postdir`
- `source` + `source_last_updated`

And enforce unique keys by `(municipality, street_name_normalized)`.

## Current status

- Source research completed (shortlist above).
- Next implementation step: fetch official roadway data, filter to Fall River, and generate an app-ready JSON list.
