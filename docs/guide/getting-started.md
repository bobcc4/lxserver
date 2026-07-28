# 快速开始

V1 适合个人 NAS、单用户或少量用户使用。下载与缓存文件使用可读文件名，能够直接在 NAS 文件系统中查看和管理。

## 部署前准备

- 推荐：Docker 24 或更高版本、Docker Compose v2。
- 源码运行：Node.js 22.12 或更高版本，推荐 Node.js 24 LTS。
- 默认端口：`9527`。
- 正式镜像：`bobcc4/lxserver:v1`。
- 至少持久化 `/server/data`；需要下载和管理源文件时，还应持久化 `/server/cache`、`/server/music` 和 `/server/logs`。

## Docker Compose 部署

```yaml
services:
  yintuan:
    image: bobcc4/lxserver:v1
    container_name: yintuan
    restart: unless-stopped
    ports:
      - "9527:9527"
    volumes:
      - ./data:/server/data
      - ./logs:/server/logs
      - ./cache:/server/cache
      - ./music:/server/music
    environment:
      NODE_ENV: production
      # FRONTEND_PASSWORD: change-me
      # ENABLE_WEBPLAYER_AUTH: "true"
      # WEBPLAYER_PASSWORD: change-me
```

启动：

```bash
docker compose up -d
```

升级：

```bash
docker compose pull
docker compose up -d
```

升级容器不会删除已挂载目录。不要在未确认挂载正确前删除旧容器数据。

## 桌面客户端部署

从 [GitHub Releases](https://github.com/bobcc4/lxserver/releases/latest) 下载与系统和 CPU 对应的安装包。首次启动且没有有效历史路径时，程序会提示选择存储位置。

桌面客户端关闭窗口后默认缩到系统托盘，服务仍继续运行。存储路径的查看和迁移请阅读[桌面客户端](/guide/desktop)。

## 源码运行

```bash
git clone https://github.com/bobcc4/lxserver.git
cd lxserver
npm ci
npm run build
npm start
```

源码部署需要自行负责进程守护、开机启动和数据目录持久化。

## 首次访问

| 功能 | 默认地址 | 默认凭据 |
| --- | --- | --- |
| 管理后台 | `http://服务器IP:9527/` | 管理密码 `123456` |
| Web 播放器 | `http://服务器IP:9527/music` | 同步账户 `admin` / `password` |
| Subsonic | `http://服务器IP:9527/rest` | 同步账户用户名与密码 |

首次登录后立即完成以下操作：

1. 在管理后台修改默认管理密码。
2. 修改 `admin` 同步账户密码，或创建自己的同步账户。
3. 确认 `/data`、`/cache`、`/music`、`/logs` 均映射到 NAS 持久化目录。
4. 登录 Web 播放器并导入仅来自可信来源的音源脚本。
5. 需要外网访问时配置 HTTPS 反向代理，不要直接暴露管理后台。

## 访问路径说明

- `ADMIN_PATH` 修改管理后台路径。
- `PLAYER_PATH` 修改播放器路径，默认 `/music`。
- `SUBSONIC_PATH` 修改 Subsonic 路径，默认 `/rest`。
- `USER_ENABLE_ROOT=true` 时，LX 同步地址可直接填写服务根地址。
- `USER_ENABLE_PATH=true` 时，LX 同步地址使用 `服务地址/用户名`。

根路径与用户路径的选择详见[账户与 LX 同步](/guide/accounts-sync)。

## 反向代理要点

反向代理必须支持 WebSocket、Range 请求和较长的流媒体连接。建议保留以下请求头：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_http_version 1.1;
proxy_read_timeout 3600s;
```

## 部署检查

1. 管理后台能够登录并显示服务状态。
2. Web 播放器能使用同步账户登录。
3. 下载一首测试歌曲后，NAS 的 `music/<用户名>` 中出现音频文件。
4. 清理缓存时只影响 `cache/<用户名>`，不影响下载目录。
5. 重建容器后，账户、歌单、设置和下载队列仍存在。

遇到异常请先查看[故障排查](/guide/troubleshooting)。
