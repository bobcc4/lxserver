# Yinyun

<p align="center"><img src="../public/icon.svg" width="120" height="120" alt="Yinyun"></p>

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

[Documentation](https://bobcc4.github.io/lxserver/) | [WebPlayer](../README_EN.md) | [Changelog](../changelog.md)

Yinyun provides a powerful Web player, **LX Music data synchronization**, and a visual management dashboard.

## ✨ Sync Server Key Features

### 📊 Dashboard
Intuitive Web interface to monitor service status and connections in real-time.
![Dashboard](../docs/public/screenshots/admin-dashboard.png)

### 👥 User Management
Easily add/delete users and modify sync keys via the UI to manage multi-device access permissions.
![User Management](../docs/public/screenshots/admin-users.png)

### 🎵 Deep Data Management
- View playlists and song lists online for all users.
- Support for searching and sorting to quickly locate songs.
- Support for batch clearing redundant data or deleting playlists.

### 💾 Snapshot Management
- **Auto Backup**: Server automatically generates historical data snapshots.
- **Local Download**: Snapshots can be downloaded as `lx_backup.json` for direct import into LX Music clients.
- **One-click Rollback**: Roll back data to a specific snapshot point to prevent data loss.

### 📂 File & System Logs
Built-in lightweight file management system for viewing, downloading, and searching system logs online.

### ☁️ WebDAV Real-time Cloud Sync
- Supports Nutstore, Nextcloud, Alist, and other standard WebDAV drives.
- Supports scheduled full data backup to the cloud.
- Supports one-click restoration from cloud after server reset.

### ⚙️ System Configuration

Configure access paths, synchronization modes, Subsonic, WebDAV, proxies, cache limits, and other server options from the dashboard.
![System Configuration](../docs/public/screenshots/admin-config.png)

---

## 📖 Dashboard Guide

1. **Access Dashboard**: Visit `http://your-ip:9527`.
2. **Initial Setup**: Change your default password in "System Config" immediately after first login.
3. **Add User**: Create sync accounts in the "User Management" page. The generated password is the key for LX Music client connection. (Default: username `admin`, password `password`).
4. **Backup Strategy**: It's highly recommended to configure cloud backup in "WebDAV Sync" for data safety.

> 💡 For more technical details (Docker deployment, Nginx config, variables, etc.), please return to the **[Project Homepage (README_EN.md)](../README_EN.md)**.
