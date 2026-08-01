# 音云 Yinyun

<div align="center">
  <img src="/icon.svg" width="100" height="100" alt="Yinyun Logo">
  <br>
  <h1>音云 Yinyun</h1>
  <p>
    <img src="https://img.shields.io/badge/hash-{{buildHash}}-%2310b981?style=flat-square" alt="Build Hash">
    <img src="https://img.shields.io/badge/version-{{version}}-blue?style=flat-square" alt="Version">
    <a href="/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-orange?style=flat-square" alt="License"></a>
  </p>
</div>

音云是基于 [lyswhut/lx-music-sync-server](https://github.com/lyswhut/lx-music-sync-server) 持续改造的私有音乐服务器，提供 Web 播放、下载、本地曲库、Windows 账户快照和 Subsonic 接入。

本项目在原版基础上增加了强大的 **Web 管理界面**，支持用户管理、数据查看、快照回滚、WebDAV 备份等高级功能，让私有化部署更加便捷易用。

## ✨ 主要特性

### 📊 仪表盘

直观的 Web 界面，无需敲命令即可管理服务状态。

### 👥 用户管理

支持通过界面添加、删除用户，修改密码，轻松管理多用户权限。

### 🎵 数据查看与管理

- 在线查看所有用户的歌单和歌曲详情。
- 支持按歌单、歌曲名搜索和排序。
- 支持批量删除歌曲、删除歌单。

### 💾 快照管理 (Snapshot)

- **查看快照**：浏览服务器自动生成的历史数据快照。
- **下载备份**：下载服务端历史快照，用于服务器数据恢复。
- **一键回滚**：支持将服务器数据回滚到任意历史时刻。

### 📂 文件与日志管理

内置简易文件管理器，方便在线查看、下载和管理服务器上的日志和配置文件。

### ⚙️ 系统配置

支持通过 Web 界面修改系统配置（端口、代理、密码等），无需手动编辑 `config.js` 文件。

### ☁️ WebDAV 同步备份

- 支持将服务器数据自动/手动备份到 WebDAV 网盘（如坚果云、Nextcloud、Alist 等）。
- 支持从 WebDAV 云端恢复数据，确保数据安全。

### 🎧 Web 播放器

**[Web 播放器](/music)**：内置功能强大的 Web 端音乐播放器，支持多源搜索、歌单同步、歌词显示等，随时随地享受音乐。

## 🤝 致谢

本项目修改自 [lyswhut/lx-music-sync-server](https://github.com/lyswhut/lx-music-sync-server)。

WEB页端LX的实现参考 [lx-music-desktop](https://github.com/lyswhut/lx-music-desktop)。

接口实现通过 [musicsdk](https://github.com/lyswhut/lx-music-desktop) 实现。

感谢 [lyswhut](https://github.com/lyswhut) 开发了如此优秀的开源音乐软件。

<div align="center" style="margin-top: 30px;">
  <a href="https://github.com/bobcc4/yinyun-lxserver" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; vertical-align: bottom; margin-right: 8px;">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
    GitHub 仓库
  </a>

</div>

Copyright © 2026 [bobcc4](https://github.com/bobcc4)
