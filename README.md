# RPInSight

AI-assisted campus navigation for Rensselaer Polytechnic Institute. RPInSight combines a Mapbox campus map, curated GeoJSON location layers, directions, and a Puckman search assistant for finding dining, study, lecture, and parking locations around campus.

## What It Shows

- Campus-first geospatial product UX built with Next.js, React, Tailwind, and Mapbox GL.
- Curated RPI location layers stored as GeoJSON under `src/data/`.
- AI-assisted search through `/api/search`, grounded in the local campus dataset before falling back to known RPI locations.
- Walking, cycling, and driving directions through `/api/directions`.
- A small data QA surface that links to the public QGIS portfolio project as evidence of geospatial data production and review workflow.

## Data Layers

| Layer | File | Count | Purpose |
|---|---:|---:|---|
| Dining halls | `src/data/dining_halls.geojson` | 4 | Meal-plan dining and food locations. |
| Study halls | `src/data/study_halls.geojson` | 4 | Library and student study spaces. |
| Lecture halls | `src/data/lecture_halls.geojson` | 9 | Major classroom and academic buildings. |
| Parking | `src/data/parking.geojson` | 5 | Visitor and permit parking points. |

The campus data is intentionally compact and reviewable. For a fuller example of source notes, QA flags, consistent schemas, and export packaging, see the companion QGIS project: <https://github.com/Taz33m/qgis-ai-geospatial-assets>.

## Local Development

Create an `.env.local` file with:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_MAPBOX_STYLE_URL=your_mapbox_style_url
NEXT_PUBLIC_CAMPUS_CENTER_LNG=-73.6788
NEXT_PUBLIC_CAMPUS_CENTER_LAT=42.7298
OPENAI_API_KEY=your_openai_api_key
```

Then run:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Validation

```bash
npm run build
```

The build checks the Next.js app, TypeScript route handlers, and bundled GeoJSON imports.
