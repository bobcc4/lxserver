const CACHE_NAME = 'yinyun-player-v1.5.0';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/_player/app.js',
    // CSS
    '/_player/css/theme_variables.css',
    '/_player/assets/fontawesome/css/all.min.css',
    // 核心 JS
    '/_player/js/lyric-parser.js',
    '/_player/js/lyric-utils.js',
    '/_player/js/lyric-card.js',
    '/_player/js/quality.js',
    '/_player/js/user_sync.js',
    '/_player/js/batch_pagination.js',
    '/_player/js/single_song_ops.js',
    '/_player/js/songlist_manager.js',
    '/_player/js/list_search.js',
    '/_player/js/leaderboard_manager.js',
    '/_player/js/local_music.js',
    '/_player/js/download_manager.js',
    '/_player/js/pwa.js',
    '/_player/js/theme_manager.js',
    '/_player/js/tailwind_setup.js',
    '/_player/js/log_viewer.js',
    '/_player/js/ios-background-audio.js',
    // 第三方库
    '/_player/assets/tailwindcss.js',
    '/_player/js/crypto-js.min.js',
    '/_player/js/NoSleep.min.js',
    '/_player/js/Sortable.min.js',
    '/_player/js/marked.min.js',
    // 音频效果
    '/_player/js/sound-effects.js',
    '/_player/js/visualizer.js',
    '/_player/js/wave.js',
    // 变调器
    '/_player/js/pitch-shifter/fft.js',
    '/_player/js/pitch-shifter/ola-processor.js',
    '/_player/js/pitch-shifter/phase-vocoder.js',
    // 静态资源
    '/_player/assets/logo.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. 过滤非 http(s) 协议 (如 chrome-extension://)，避免 cache.put 报错
    if (!url.protocol.startsWith('http')) return;

    // 2. 忽略所有音频请求、下载请求和 API 请求，让浏览器直接处理
    // 拦截下载会导致大文件占用 Cache 且单个失败可能引起 SW state 不良
    const isApiOrAudio = url.pathname.includes('/api/') ||
        url.href.match(/\.(mp3|flac|m4a|ogg|aac)(\?.*)?$/i);

    if (isApiOrAudio) {
        return; // 直接 return 就不走 event.respondWith，相当于不拦截
    }

    // 3. 常规静态资源采用 Network First 策略
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 如果请求成功，更新缓存并返回
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache).catch(err => {
                            console.error('[SW] Cache put error:', err);
                        });
                    });
                }
                return response;
            })
            .catch(() => {
                // 网络不可用时，尝试从缓存获取
                return caches.match(event.request);
            })
    );
});

const KNOWN_CACHES = [CACHE_NAME];

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!KNOWN_CACHES.includes(cacheName)) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});
