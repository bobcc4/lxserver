---
layout: home

hero:
  name: "Yinyun"
  text: "Playback, downloads, and synchronization"
  tagline: "Deploy and manage a private music service with a Web player, local library, LX synchronization, and Subsonic support"
  image:
    src: /icon.svg
    alt: Yinyun
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/bobcc4/lxserver

features:
  - title: Web Playback and Downloads
    details: Search multiple platforms, choose from eight quality levels, manage playlists, lyrics, server downloads, and persistent download queues.
    link: /en/guide/web-player
  - title: Local Library
    details: Scan nested directories under /music and /cache, keep readable source files, and use Boolean search, batch operations, and remastering.
    link: /en/guide/web-player
  - title: Synchronization and Clients
    details: Synchronize LX Music data and connect Stream Music, LMP, Feishin, and other Subsonic clients.
    link: /en/guide/sync-server
  - title: Administration
    details: Manage users, devices, snapshots, WebDAV backups, logs, access paths, proxies, and cache limits from the dashboard.
    link: /en/guide/sync-server

---

## Interface Preview

![Web player online search](/screenshots/web-search.png)

Search, play, favorite, and download from one interface.

![Server management dashboard](/screenshots/admin-dashboard.png)

Monitor service status and open user, data, backup, log, and configuration tools from the dashboard.

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
}
</style>
