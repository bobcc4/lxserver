# API v1 迁移说明

`v1.4.0` 是音云 V1 产品线的破坏性接口升级。这里的 `v1` 是当前接口命名空间，不是已封存的 V2 产品线，也不会创建 `/api/v2`。

## 新路径

- 原生客户端：`/api/v1/...`
- 管理后台：`/api/v1/admin/...`
- Web 播放器音乐接口：`/api/v1/player/music/...`
- Web 播放器用户、收藏和设置接口：`/api/v1/player/user/...`
- Web 播放器自定义音源接口：`/api/v1/player/custom-source/...`
- Subsonic：`/rest/...`

## 已移除路径

裸 `/api/...` 已移除，服务器会返回 HTTP `410 Gone`。旧 Web 页面、旧 Windows 客户端以及直接调用旧路径的脚本不能继续使用。

## 升级顺序

1. 备份现有 `/server/data`、`/server/cache`、`/server/music` 和 `/server/logs` 持久化目录。
2. 升级服务端到 `v1.4.0`，反向代理放行 `/api/v1/*` 和 `/rest/*`，并保留音频 Range 请求。
3. Windows 客户端升级到 `v1.1.0`。
4. 第三方 Subsonic 客户端继续使用服务地址、同步账户用户名和密码连接 `/rest`。

本次升级不改变持久化目录和数据格式，但接口不再兼容旧客户端，发布前仍建议保留备份。
