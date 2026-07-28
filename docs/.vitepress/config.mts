import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/lxserver/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/lxserver/icon.svg' }]
  ],
  themeConfig: {
    logo: '/icon.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/bobcc4/lxserver' }
    ],
    search: {
      provider: 'local'
    }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: "音团 Yintuan",
      description: "支持 Web 播放、下载、本地曲库、LX Music 同步与 Subsonic 的私有音乐服务器",
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '功能总览', link: '/guide/features' },
          { text: '使用指南', link: '/guide/getting-started' },
          { text: '配置指南', link: '/guide/configuration' },
          { text: 'API 文档', link: '/api/reference' },
          { text: '更新日志', link: 'https://github.com/bobcc4/lxserver/blob/main/changelog.md' }
        ],
        sidebar: [
          {
            text: '开始使用',
            items: [
              { text: '快速开始', link: '/guide/getting-started' },
              { text: '全部功能', link: '/guide/features' },
              { text: '桌面客户端', link: '/guide/desktop' }
            ]
          },
          {
            text: '播放器与音乐管理',
            items: [
              { text: 'Web 播放器', link: '/guide/web-player' },
              { text: '本地曲库与下载', link: '/guide/library-downloads' },
              { text: '歌曲洗版', link: '/guide/remaster' },
              { text: '自定义音源', link: '/guide/custom-sources' }
            ]
          },
          {
            text: '账户与客户端',
            items: [
              { text: '账户与 LX 同步', link: '/guide/accounts-sync' },
              { text: '歌单与音源分享', link: '/guide/sharing' },
              { text: 'Subsonic 客户端', link: '/guide/subsonic' }
            ]
          },
          {
            text: '服务器管理',
            items: [
              { text: '管理后台', link: '/guide/sync-server' },
              { text: '备份与数据目录', link: '/guide/storage-backup' },
              { text: '故障排查', link: '/guide/troubleshooting' }
            ]
          },
          {
            text: '配置指南',
            items: [
              { text: '配置文件及环境变量', link: '/guide/configuration' }
            ]
          },
          {
            text: 'API 文档',
            items: [
              { text: '服务端 API 参考', link: '/api/reference' }
            ]
          }
        ],
        footer: {
          message: 'Released under the Apache-2.0 License.',
          copyright: 'Copyright © 2026 bobcc4 & Contributors'
        },
        outline: { level: [2, 3], label: '本页目录' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: { text: '最后更新' },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '外观'
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: "Yintuan",
      description: "A self-hosted music server with Web playback, downloads, LX Music sync, and Subsonic support",
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Usage Guide', link: '/en/guide/getting-started' },
          { text: 'Config Guide', link: '/en/guide/configuration' },
          { text: 'API Docs', link: '/en/api/reference' },
          { text: 'About', link: '/en/about' }
        ],
        sidebar: [
          {
            text: 'Usage Guide',
            items: [
              { text: 'Getting Started', link: '/en/guide/getting-started' }
            ]
          },
          {
            text: 'Core Features',
            items: [
              { text: 'Sync Server Settings', link: '/en/guide/sync-server' },
              { text: 'Web Player Guide', link: '/en/guide/web-player' }
            ]
          },
          {
            text: 'Config Guide',
            items: [
              { text: 'Config & Env Vars', link: '/en/guide/configuration' }
            ]
          },
          {
            text: 'API Docs',
            items: [
              { text: 'Server API Ref', link: '/en/api/reference' }
            ]
          }
        ],
        footer: {
          message: 'Released under the Apache-2.0 License.',
          copyright: 'Copyright © 2026 bobcc4 & Contributors'
        }
      }
    }
  }
})
