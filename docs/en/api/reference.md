# Server API Reference

Yinyun provides RESTful APIs for retrieving and managing synchronization data and server status.

## Overview
To ensure security, all APIs require authentication. Currently, two main authentication methods are supported:

1.  **Administrator Authentication (`x-frontend-auth`)**: Uses the global password (`frontend.password`) set during server configuration. Used for sensitive server controls, user management, and global data extraction.
2.  **User Token Authentication (`x-user-token`)**: Uses a dynamic Session Token obtained via the login interface or a persistent API Token generated in the management panel. Used for operating specific user data (e.g., playlists, settings, cache).

Unless otherwise specified, all interfaces **use JSON as the request body and response body** type (`Content-Type: application/json`).

---

## 1. Authentication & Account Management API

### 1.1 Admin: Service Status (`GET /api/v1/admin/status`)
Get the overall memory consumption, device online status, and uptime summary.
- **Header Auth**: `x-frontend-auth: <Admin Password>`

### 1.2 Admin: User Management (`/api/v1/admin/users`)
- **Header Auth**: `x-frontend-auth: <Admin Password>`
- `GET /api/v1/admin/users`: Get a list of all users and their passwords.
- `POST /api/v1/admin/users`: Create a new user (`{"name": "...", "password": "..."}`).
- `PUT /api/v1/admin/users`: Update user info (Rename or update password) (`{"name": "OldName", "newName": "NewName", "password": "NewPassword"}`).
- `DELETE /api/v1/admin/users`: Delete users (`{"names": ["..."], "deleteData": true}`).

### 1.3 User: Login (`POST /api/v1/player/user/login`)
Login with username and password to receive a Token.
- **Body**: `{"username": "...", "password": "..."}`
- **Response**: `{"success": true, "token": "lx_tk_...", "username": "..."}`

### 1.4 User: Logout (`POST /api/v1/player/user/logout`)
Invalidate the current Session Token.
- **Header Auth**: `x-user-token: <Token>`

### 1.5 User: Verify Auth (`GET /api/v1/player/user/auth/verify`)
Check if the current Token is still valid.
- **Header Auth**: `x-user-token: <Token>`

---

## 2. Token Security Management API
Used to manage persistent API Tokens in the management panel or client. Requires `x-user-token` authentication.

- `GET /api/v1/player/user/token/config`: Get the current user's Token authentication configuration (enabled status and list).
- `POST /api/v1/player/user/token/config`: Enable or disable Token authentication (`{"enabled": true/false}`).
- `POST /api/v1/player/user/token/add`: Generate a new persistent API Token (`{"name": "Name", "expireDays": 7}`).
- `POST /api/v1/player/user/token/remove`: Delete a specific Token (`{"token": "..."}`).
- `POST /api/v1/player/user/token/update`: Update Token information (name, expiry).
- `POST /api/v1/player/user/token/toggle`: Enable or disable a specific generated Token.
- `GET /api/v1/player/user/token/logs`: Get audit/access logs for a specific Token (requires `tokenMasked` parameter).

---

## 3. Data & Synchronization API
These interfaces manage the core synchronization data for users.

### 3.1 Playlist Management
- `GET /api/v1/player/user/list`: Get the user's current complete playlist data.
- `POST /api/v1/player/user/list`: Full overwrite update of the user's playlist data (triggers sync broadcast).
- `POST /api/v1/player/music/user/list/remove`: Batch delete songs from a specific playlist (`{"listId": "...", "songIds": [...]}`).

### 3.2 Historical Snapshots
- `GET /api/v1/admin/data/snapshots`: Get a list of snapshots.
- `GET /api/v1/admin/data/snapshot`: Get data of a specific snapshot.
- `POST /api/v1/admin/data/restore-snapshot`: Restore to a specific snapshot point.
- `POST /api/v1/admin/data/delete-snapshot`: Delete a specific snapshot.
- `POST /api/v1/admin/data/upload-snapshot`: Manually upload a backup snapshot.

### 3.3 User Settings & Sound Effects
- `GET /api/v1/player/user/settings`: Get user application settings.
- `POST /api/v1/player/user/settings`: Update user application settings.
- `GET /api/v1/player/user/sound-effects`: Get user equalizer/sound effect settings.
- `POST /api/v1/player/user/sound-effects`: Update user sound effect settings.

---

## 4. Multimedia Core API (Web Player Support)

### 4.1 Search & Tips
- `GET /api/v1/player/music/search`: Music search (supports `kw`, `kg`, `tx`, `wy`, `mg`).
- `GET /api/v1/player/music/tipSearch`: Search keyword suggestions.
- `GET /api/v1/player/music/hotSearch`: Real-time hot search terms from various platforms.

### 4.2 Square & Leaderboards
- `GET /api/v1/player/music/songList/tags`: Get playlist category tags.
- `GET /api/v1/player/music/songList/list`: Get selected playlist list for a tag.
- `GET /api/v1/player/music/songList/detail`: Get playlist details (full song list).
- `GET /api/v1/player/music/leaderboard/boards`: Get leaderboard categories.
- `GET /api/v1/player/music/leaderboard/list`: Get songs within a leaderboard.

### 4.3 Playback & Lyrics
- `POST /api/v1/player/music/url`: Get direct playback link.
  - **Header Support**: Optional `x-req-id` for SSE progress tracking.
  - **Progress**: Sse progress for custom source resolution can be tracked via `GET /api/v1/player/music/progress?reqId=xxx`.
- `POST /api/v1/player/music/lyric`: Get lyrics.
- `POST /api/v1/player/music/comment`: Get song comments (supports `hot`/`new` types).

### 4.4 Download Proxy (`GET /api/v1/player/music/download`)
Proxy download music files with automatic ID3 tag injection.
- **Params**: `url`, `filename`, `tag=1` (inject tags), `name`, `singer`, `album`, `pic`.

---

## 5. Server-side File Cache API
Users can manage music files and lyrics cached on the server.

- `GET /api/v1/player/music/cache/stats`: Get the current user's cache statistics (file count, space usage).
- `GET /api/v1/player/music/cache/list`: Get detailed list of cached files.
- `POST /api/v1/player/music/cache/download`: Trigger server-side background download and cache.
- `POST /api/v1/player/music/cache/remove`: Remove specific cached files.
- `POST /api/v1/player/music/cache/clear`: Clear all music cache.
- `POST /api/v1/player/music/cache/lyric`: Save or read lyric cache.

---

## 6. Custom Source Management API
- `GET /api/v1/player/custom-source/list`: Get a list of imported custom sources.
- `POST /api/v1/player/custom-source/import`: Import custom source scripts online.
- `POST /api/v1/player/custom-source/upload`: Upload local script files.
- `POST /api/v1/player/custom-source/toggle`: Enable or disable a source.
- `POST /api/v1/player/custom-source/delete`: Delete a custom source.
- `POST /api/v1/player/custom-source/reorder`: Reorder custom sources.

---

## 7. Global System Configuration API (Admin Only)

Used by the management dashboard for real-time adjustments of server behavior. Requires `x-frontend-auth`.

- `GET /api/v1/admin/config`: Get all current global configuration items (including final values overridden by env vars).
- `POST /api/v1/admin/config`: Incrementally update global configuration.
  - **Body Example**: `{"singer.sourcePriority": ["tx", "wy"]}`
  - **Validation**: Certain fields like `singer.sourcePriority` will be validated for correctness.

---

## 8. Web Player Specific API

Interfaces designed specifically for Web Player frontend logic. Requests involving user data use sync-account token authentication.

### 8.1 Runtime Config

### 8.2 Enhanced Metadata Details
- `GET /api/v1/player/music/artistDetail`: Get rich artist information.
  - **Params**: `source` (tx/wy), `id` (Artist Mid/ID).
  - **Returns**: Object with `name`, `desc`, `avatar`, `fans`, etc.
- `GET /api/v1/player/music/artistAlbums`: Paged retrieval of artist's album list.
- `GET /api/v1/player/music/artistSongs`: Paged retrieval of artist's full song list.
- `GET /api/v1/player/music/albumSongs`: Get details of all tracks in a specific album.

### 8.3 Real-time Progress (SSE)
- `GET /api/v1/player/music/progress?reqId=xxx`: real-time subscription to external link resolution and cache progress via Server-Sent Events (SSE).
