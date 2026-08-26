## v1.6.4

### 移除局域网投放

- 移除 Web 播放器中的 DLNA/UPnP 投放按钮和弹窗。
- 移除 DLNA 设备发现、媒体会话和控制 API。
- 移除服务端投放模块及其测试。
- 外部音乐库仍可通过本地音乐、网页播放和 Subsonic 使用。

## v1.6.3 (2026-08-24)

### External music libraries

- Added administrator-managed external music library configurations using `/server/external/<username>/<library-name>`.
- External libraries are recursively indexed and available in Local Music, Web playback, and Subsonic.
- External indexes are stored under `/server/data/external-index`; read-only mounts never receive metadata, lyric, rename, remaster, cleanup, or delete writes.
- Added ownership checks for external storage locations and admin controls for add, rescan, and remove-configuration operations.
- Documented the recommended `:ro` Docker Compose mapping and clarified that removing a configuration does not delete host music files.
