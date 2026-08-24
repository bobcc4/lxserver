## v1.6.3 (2026-08-24)

### External music libraries

- Added administrator-managed external music library configurations using `/server/external/<username>/<library-name>`.
- External libraries are recursively indexed and available in Local Music, Web playback, DLNA, and Subsonic.
- External indexes are stored under `/server/data/external-index`; read-only mounts never receive metadata, lyric, rename, remaster, cleanup, or delete writes.
- Added ownership checks for external storage locations and admin controls for add, rescan, and remove-configuration operations.
- Documented the recommended `:ro` Docker Compose mapping and clarified that removing a configuration does not delete host music files.
