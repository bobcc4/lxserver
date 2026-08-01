module.exports = {
  "serverName": "yinyun",
  "proxy.enabled": false,
  "proxy.header": "x-real-ip",
  "bindIP": "0.0.0.0",
  "port": 19527,
  "user.enablePath": false,
  "user.enableRoot": true,
  "user.enableLoginCacheRestriction": false,
  "user.enableCacheSizeLimit": false,
  "user.cacheSizeLimit": 2000,
  "maxSnapshotNum": 10,
  "list.addMusicLocationType": "top",
  "disableTelemetry": false,
  "users": [
    {
      "name": "admin",
      "password": "password",
      "dataPath": "D:\\1projects\\lxserver\\data\\users\\admin_21232f"
    }
  ],
  "frontend.password": "123456",
  "webdav.enable": false,
  "webdav.url": "",
  "webdav.username": "",
  "webdav.password": "",
  "webdav.syncPath": "/lx-sync",
  "webdav.backupPath": "/lx-sync-backups",
  "sync.interval": 60,
  "sync.backupInterval": 24,
  "proxy.all.enabled": false,
  "proxy.all.address": "",
  "admin.path": "",
  "player.path": "/music",
  "subsonic.enable": true,
  "subsonic.path": "/rest",
  "subsonic.enableDebug": true,
  "subsonic.onlineSearch": true,
  "subsonic.onlineSearchMode": "fallback",
  "subsonic.onlineSearchSources": "wy,tx,kw,kg,mg",
  "subsonic.lyricTranslation": true,
  "singer.sourcePriority": [
    "tx",
    "wy"
  ],
  "artist.maxFetchPages": 20,
  "cache.namingPattern": "simple",
  "system.allowUnsafeVM": false
}