"""External POI providers for Be Inspired (Overpass/OSM, Wikidata, Geoapify, Foursquare).

POIs are live-fetched per map area, normalized to a common shape (see `normalize.py`),
deduplicated and cached, then merged with platform POIs on the frontend. Nothing is
persisted to the DB until a user actually uses a POI (lazy import via the import view).
"""
