---
layout: home

hero:
  name: "LX Sync Server"
  text: "V1 使用帮助"
  tagline: "部署、同步、播放、下载、曲库管理和第三方客户端连接手册"
  image:
    src: /icon.svg
    alt: LX Sync Server
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/getting-started
    - theme: alt
      text: 浏览全部功能
      link: /guide/features

features:
  - title: 部署与管理
    details: Docker、桌面客户端、源码部署、数据持久化、用户管理、快照、WebDAV 和日志排查。
    link: /guide/getting-started
  - title: Web 播放与下载
    details: 多平台搜索、八档音质、播放队列、歌词、音效、服务器下载、缓存和断点续传队列。
    link: /guide/web-player
  - title: 本地曲库
    details: 多层目录扫描、布尔搜索、批量筛选、元数据与封面歌词补全、歌单收藏和歌曲洗版。
    link: /guide/library-downloads
  - title: 多端连接
    details: LX Music 数据同步、账户设置同步，以及音流、LMP、Feishin 等 Subsonic 客户端接入。
    link: /guide/accounts-sync
  - title: 分享与音源
    details: 用户间歌单邀请、管理员音源共享、自定义源隔离、代理与安全设置。
    link: /guide/sharing
  - title: 故障排查
    details: 登录、播放、下载、曲库扫描、歌词封面、Subsonic 和桌面客户端常见问题。
    link: /guide/troubleshooting

---

## 使用顺序

1. 按照[快速开始](/guide/getting-started)完成部署和目录持久化。
2. 修改默认管理密码，创建同步用户并确认播放器登录正常。
3. 阅读[账户与 LX 同步](/guide/accounts-sync)或[Subsonic 客户端](/guide/subsonic)连接其他设备。
4. 下载前阅读[本地曲库与下载](/guide/library-downloads)，明确 `/cache` 与 `/music` 的区别。

> 本文档对应 `bobcc4/lxserver:v1`。V2 已停止维护，不建议新部署。
