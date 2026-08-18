## v1.6.0 (2026-08-18)

### 运行时与构建工具链

- Electron 从 `42.x` 升级到 `43.4.0`，桌面服务端继续覆盖 Windows、macOS 和 Linux 的现有发布架构。
- ESLint 生态升级到 ESLint `9.35.0`、TypeScript ESLint `8.67.0` 和 `eslint-config-love 155.0.0`。
- 升级 `rimraf` 到 `6.1.3`、`lru-cache` 到 `11.5.2`、`tsc-alias` 到 `1.9.2`、`chalk` 到 `6.0.0`。
- TypeScript 保持 `6.0.3`；TypeScript `7.x` 当前超出 TypeScript ESLint 的受支持版本范围，本次不进行无效升级。

### 音频标签引擎

- `music-tag-native` 从 `0.2.5` 升级到 `1.0.0`，使用新的 `MusicFile` 原生接口读取和写入音频元数据。
- 增加服务端标签适配层，保留本地曲库扫描、音质识别、标题/歌手/专辑写入、封面嵌入和歌词嵌入能力。
- 已通过真实 WAV 文件完成元数据、封面和歌词写入后重新读取验证。

### 验证与升级说明

- 54 项自动化测试、TypeScript 构建和 `npm audit` 全部通过，已知漏洞为 0。
- 本版本不修改数据目录、数据库和 `/api/v1` 接口结构，可以从 `v1.5.8` 直接升级。
