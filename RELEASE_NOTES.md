## v1.6.2 (2026-08-24)

### Server-side network playlist monitoring

- Moved network playlist update checks from the browser timer to a persistent server background task.
- Checks continue after the browser is closed and follow each user's enable switch and interval.
- Persisted per-playlist status keeps update indicators and records the last error without losing the previous update state.

### LAN casting

- Added DLNA/UPnP MediaRenderer discovery and server-side casting controls for play, pause, stop, and volume.
- Only files already present in the current user's server cache or music directory can be cast.
- Added short-lived cast sessions so a renderer can stream from the NAS without browser authentication headers.
- AirPlay, Chromecast, and private speaker protocols such as XiaoAI are not claimed as supported in this release.

### Upgrade notes

- This release keeps the existing data directories and `/api/v1` structure. No migration is required.
