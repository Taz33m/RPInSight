# Security Policy

RPInSight is a portfolio project, but it still follows basic public-repo security hygiene.

## Supported Scope

Security review covers the public Next.js application, API routes, bundled GeoJSON data, and environment-variable handling in this repository.

## Reporting

Please report security concerns privately to the repository owner instead of opening a public issue with exploit details.

## Current Guardrails

- Mapbox and OpenAI credentials are read from environment variables.
- Server routes validate request shape before calling external APIs.
- Search and directions routes include lightweight request throttling.
- Directions are bounded to the campus area to reduce accidental token abuse.
- Directions requests avoid logging token-bearing Mapbox URLs.
- Map popup HTML escapes bundled GeoJSON properties before rendering.
- Security headers disable framing, MIME sniffing, and unnecessary browser permissions.

## Non-Goals

- RPInSight is not an official RPI service.
- Campus locations are a compact curated dataset, not an authoritative facilities database.
- Search answers may be approximate and should be treated as navigation assistance, not emergency guidance.
