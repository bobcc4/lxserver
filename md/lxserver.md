# 音云 Yinyun

<p align="center"><img src="../public/icon.svg" width="120" height="120" alt="音云 Yinyun"></p>

<div align="center">
  <p>
    <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build Status">
    <img src="https://img.shields.io/badge/version-v1.1.3-blue?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/node-%3E%3D22.12-green?style=flat-square" alt="Node Version">
    <img src="https://img.shields.io/github/license/bobcc4/lxserver?style=flat-square" alt="License">
    <br>
    <br>
    <a href="https://github.com/bobcc4/lxserver/stargazers"><img src="https://img.shields.io/github/stars/bobcc4/lxserver?style=flat-square&color=ffe16b" alt="GitHub stars"></a>
    <a href="https://github.com/bobcc4/lxserver/network/members"><img src="https://img.shields.io/github/forks/bobcc4/lxserver?style=flat-square" alt="GitHub forks"></a>
    <a href="https://github.com/bobcc4/lxserver/issues"><img src="https://img.shields.io/github/issues/bobcc4/lxserver?style=flat-square&color=red" alt="GitHub issues"></a>
    <a href="https://github.com/bobcc4/lxserver/commits/main"><img src="https://img.shields.io/github/last-commit/bobcc4/lxserver?style=flat-square&color=blueviolet" alt="Last Commit"></a>
    <img src="https://img.shields.io/github/commit-activity/m/bobcc4/lxserver?style=flat-square&color=ff69b4" alt="Commit Activity">
    <a href="https://github.com/bobcc4/lxserver/releases"><img src="https://img.shields.io/github/downloads/bobcc4/lxserver/total?style=flat-square&color=blue" alt="Total Downloads"></a>
  </p>
</div>

[帮助文档 Documentation](https://bobcc4.github.io/lxserver/) | [网页播放器 WebPlayer](../README.md) | [更新日志 Changelog](../changelog.md)

音云不仅内置了功能强大的网页播放器，还提供 **LX Music 数据同步服务**与 Web 可视化管理。

## ✨ 同步服务器核心特性

### 📊 仪表盘

直观的 Web 界面，实时掌握服务状态与连接数。
![仪表盘](../docs/public/screenshots/admin-dashboard.png)

### 👥 用户管理

支持通过界面快捷添加、删除用户，修改同步密钥，轻松管理多设备连接权限。
![用户管理](../docs/public/screenshots/admin-users.png)

### 🎵 数据深度管理

- 在线查看所有用户的歌单和歌曲列表。
- 支持搜索与排序，方便快速定位歌曲。
- 支持批量清理冗余数据或删除歌单。

### 💾 快照管理 (Snapshot)

- **自动备份**：服务器自动生成历史数据快照。
- **本地下载**：快照可下载为 `lx_backup.json`，直接导入 LX Music 客户端。
- **一键回滚**：支持将数据回滚到指定的快照点，防止误删带来的损失。

### 📂 文件与系统日志

内置轻量级文件管理系统，支持在线查看、下载和检索系统运行日志，排查问题更直观。

### ☁️ WebDAV 云端实时同步

- 支持坚果云、Nextcloud、Alist 等标准 WebDAV 网盘。
- 支持定时自动将服务器全量数据备份至云端。
- 支持在服务器重置后从云端一键拉回所有数据。

### ⚙️ 系统配置

通过管理后台配置访问路径、同步模式、Subsonic、WebDAV、代理、缓存限制和其他服务端选项。
![系统配置](../docs/public/screenshots/admin-config.png)

---

## 📖 管理后台操作指南

1. **登录管理后台**：访问 `http://your-ip:9527`。
2. **初始化配置**：首次登录请立即进入“系统配置”修改默认密码。
3. **添加用户**：在“用户管理”页面创建同步账号，生成的密码即为 LX Music 移动端/桌面端连接时使用的密钥。默认用户名admin，密码password。
4. **备份策略**：建议在“WebDAV 同步”中配置云端备份，双重保障数据安全。

> 💡 更多技术细节（如 Docker 部署、Nginx 配置、变量列表等）请返回 **[项目首页 (README.md)](../README.md)** 查看。
