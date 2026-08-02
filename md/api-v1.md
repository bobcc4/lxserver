# 音云 API v1

`/api/v1` 是音云原生客户端使用的稳定 REST/JSON 接口。接口版本独立于服务端版本；兼容性变更会继续保留在 v1，破坏性变更必须使用新的主版本路径。

## 接口文档

- 能力发现：`GET /api/v1/capabilities`
- OpenAPI 3.1：`GET /api/v1/openapi.json`
- 登录：`POST /api/v1/auth/login`
- 刷新令牌：`POST /api/v1/auth/refresh`
- 当前用户：`GET /api/v1/auth/me`

登录后的接口使用以下请求头：

```http
Authorization: Bearer <accessToken>
```

访问令牌有效期为 1 小时，刷新令牌有效期为 30 天。客户端应把刷新令牌存放在系统安全存储中，不应写入日志或普通配置文件。

## 主要资源

| 资源 | 路径 | 说明 |
| --- | --- | --- |
| 本地曲库 | `/api/v1/library/tracks` | 分页、搜索并区分缓存和下载目录 |
| 本地音频 | `/api/v1/library/tracks/{id}/stream` | 支持 `Range` 和 `HEAD` |
| 在线搜索 | `/api/v1/search` | 由服务端执行音源脚本 |
| 收藏歌手与专辑 | `/api/v1/library/artists`、`/api/v1/library/albums` | 按同步账户保存收藏数据 |
| 歌手详情 | `/api/v1/artists/{id}` | 返回歌手的全部歌曲与专辑 |
| 专辑详情 | `/api/v1/albums/{id}` | 返回专辑信息与全部歌曲 |
| 播放解析 | `/api/v1/tracks/resolve` | 返回实际音质、平台和音源信息 |
| 歌词 | `/api/v1/lyrics` | 优先读取本地歌词，再请求音源 |
| 歌单 | `/api/v1/playlists` | 创建、重命名、删除及增删歌曲 |
| 服务端下载 | `/api/v1/downloads` | 使用原有持久下载队列 |
| 洗版 | `/api/v1/replacement` | 使用原有洗版队列 |
| 音源 | `/api/v1/sources` | 包含共享音源和用户自己的平台开关 |
| 歌单分享 | `/api/v1/shares` | 分享设置、收件箱、接受和拒绝 |
| 状态事件 | `/api/v1/events` | SSE 推送下载、洗版和分享状态 |

原网页接口 `/api/*` 和 Subsonic `/rest/*` 保持不变，不应把它们视为 v1 契约的一部分。
