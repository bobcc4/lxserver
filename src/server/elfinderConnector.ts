import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { ZipArchive } from 'archiver'
import unzipper from 'unzipper'

// elFinder 文件管理器连接器
export class ElFinderConnector {
    private root: string
    private rootHash: string

    constructor(rootPath: string) {
        this.root = path.resolve(rootPath)
        this.rootHash = this.encode(this.root)
    }

    // 编码路径为hash
    private encode(filePath: string): string {
        const relative = path.relative(this.root, filePath).split(path.sep).join('/')
        const hash = Buffer.from(relative || '.').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        return 'l1_' + hash
    }

    // 解码hash为路径
    private decode(hash: string): string {
        if (hash.startsWith('TMP_')) {
            const tmpPath = Buffer.from(hash.substring(4), 'base64').toString('utf-8')
            const resolved = path.resolve(tmpPath)
            const tmpDir = require('os').tmpdir()
            if (!resolved.startsWith(tmpDir + path.sep) && resolved !== tmpDir) {
                throw new Error('Invalid temporary path')
            }
            return resolved
        }
        try {
            const rawHash = hash.startsWith('l1_') ? hash.substring(3) : hash
            const base64 = rawHash.replace(/-/g, '+').replace(/_/g, '/')
            const relative = Buffer.from(base64, 'base64').toString('utf-8')
            const resolved = path.resolve(this.root, relative)
            if (!resolved.startsWith(this.root + path.sep) && resolved !== this.root) {
                throw new Error('Path traversal detected')
            }
            return resolved
        } catch {
            return this.root
        }
    }

    // 获取文件/文件夹信息
    private async getFileInfo(filePath: string): Promise<any> {
        try {
            const stats = await fs.promises.stat(filePath)
            const name = path.basename(filePath)
            const hash = this.encode(filePath)

            const info: any = {
                name,
                hash,
                mime: stats.isDirectory() ? 'directory' : this.getMime(name),
                ts: Math.floor(stats.mtimeMs / 1000),
                size: stats.size,
                read: 1,
                write: 1,
                locked: 0
            }

            // 添加父目录hash (phash)
            if (filePath !== this.root) {
                info.phash = this.encode(path.dirname(filePath))
            }

            if (stats.isDirectory()) {
                // info.volumeid = 'l1_'
                // 检查是否有子項
                try {
                    const files = await fs.promises.readdir(filePath)
                    if (files.length > 0) {
                        info.dirs = 1
                    }
                } catch { }
            }

            // 如果是根目录
            if (filePath === this.root) {
                info.volumeid = 'l1_'
                info.isroot = 1
            }

            return info
        } catch (error) {
            return null
        }
    }

    // 获取MIME类型
    private getMime(filename: string): string {
        const ext = path.extname(filename).toLowerCase()
        const mimeTypes: Record<string, string> = {
            '.txt': 'text/plain',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.html': 'text/html',
            '.css': 'text/css',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.md': 'text/markdown',
            '.ts': 'text/plain',
            '.tsx': 'text/plain',
            '.conf': 'text/plain',
            '.ini': 'text/plain',
            '.yml': 'text/plain',
            '.yaml': 'text/plain',
            '.sh': 'text/plain',
        }
        // 默认所有未知文件都当作文本文件处理，以便可以在线编辑
        return mimeTypes[ext] || 'text/plain'
    }

    // 处理请求
    public async handle(cmd: string, params: any): Promise<any> {
        console.log(`[ElFinder] Handle command: ${cmd}`, params)
        try {
            switch (cmd) {
                case 'open':
                    return await this.cmdOpen(params)
                case 'ls':
                    return await this.cmdLs(params)
                case 'tree':
                    return await this.cmdTree(params)
                case 'parents':
                    return await this.cmdParents(params)
                case 'mkdir':
                    return await this.cmdMkdir(params)
                case 'mkfile':
                    return await this.cmdMkfile(params)
                case 'rename':
                    return await this.cmdRename(params)
                case 'rm':
                    return await this.cmdRm(params)
                case 'paste':
                    return await this.cmdPaste(params)
                case 'get':
                    return await this.cmdGet(params)
                case 'put':
                    return await this.cmdPut(params)
                case 'upload':
                    return await this.cmdUpload(params)
                case 'file':
                    return await this.cmdFile(params)
                case 'duplicate':
                    return await this.cmdDuplicate(params)
                case 'info':
                    return await this.cmdInfo(params)
                case 'search':
                    return await this.cmdSearch(params)
                case 'dim':
                    return await this.cmdDim(params)
                case 'resize':
                    return await this.cmdResize(params)
                case 'url':
                    return await this.cmdUrl(params)
                case 'archive':
                    return await this.cmdArchive(params)
                case 'extract':
                    return await this.cmdExtract(params)
                case 'size':
                    return await this.cmdSize(params)
                case 'zipdl':
                    return await this.cmdZipdl(params)
                default:
                    console.log('Unknown command:', cmd)
                    return { error: ['Unknown command'] }
            }
        } catch (error: any) {
            console.error('Command error:', cmd, error)
            return { error: [error.message || 'Internal error'] }
        }
    }

    // open - 打开文件夹
    private async cmdOpen(params: any): Promise<any> {
        const target = params.target ? this.decode(params.target) : this.root
        const init = params.init === '1'
        console.log(`[ElFinder] cmdOpen target: ${target}, init: ${init}`)

        const targetInfo = await this.getFileInfo(target)
        if (!targetInfo) {
            console.error(`[ElFinder] Target not found: ${target}`)
            return { error: ['errOpen', 'Directory not found'] }
        }
        console.log(`[ElFinder] Target info:`, targetInfo)

        const result: any = {
            cwd: targetInfo,
            files: [],
            options: {
                path: '',
                disabled: [],
                separator: '/', // 强制使用 / 作为分隔符，避免 Windows 反斜杠问题
                copyOverwrite: 1,
                archivers: {
                    create: ['application/zip'],
                    extract: ['application/zip']
                }
            }
        }

        // 如果是初始化
        if (init) {
            result.api = '2.1'
            result.uplMaxSize = '100M'
        }

        // 读取文件夹内容
        if (targetInfo.mime === 'directory') {
            try {
                const files = await fs.promises.readdir(target)
                for (const file of files) {
                    // 跳过隐藏文件
                    if (file.startsWith('.')) continue

                    const filePath = path.join(target, file)
                    const fileInfo = await this.getFileInfo(filePath)
                    if (fileInfo) {
                        result.files.push(fileInfo)
                    }
                }
            } catch (error) {
                // 忽略读取错误
            }
        }

        return result
    }

    // ls - 列出目录
    private async cmdLs(params: any): Promise<any> {
        const target = this.decode(params.target)
        const files: any[] = []

        try {
            const items = await fs.promises.readdir(target)
            for (const item of items) {
                if (item.startsWith('.')) continue
                const itemPath = path.join(target, item)
                const info = await this.getFileInfo(itemPath)
                if (info) {
                    files.push(info)
                }
            }
            return { list: files }
        } catch (error) {
            return { error: ['Error reading directory'] }
        }
    }

    // tree - 获取目录树
    private async cmdTree(params: any): Promise<any> {
        const target = this.decode(params.target)
        return { tree: await this.getTree(target) }
    }

    private async getTree(dirPath: string): Promise<any[]> {
        const tree: any[] = []
        try {
            const items = await fs.promises.readdir(dirPath)
            for (const item of items) {
                if (item.startsWith('.')) continue
                const itemPath = path.join(dirPath, item)
                const stats = await fs.promises.stat(itemPath)
                if (stats.isDirectory()) {
                    tree.push(await this.getFileInfo(itemPath))
                }
            }
        } catch { }
        return tree
    }

    // parents - 获取父级路径
    private async cmdParents(params: any): Promise<any> {
        const target = this.decode(params.target)
        const tree: any[] = []

        let current = target
        while (current !== this.root && current.startsWith(this.root)) {
            current = path.dirname(current)
            const info = await this.getFileInfo(current)
            if (info) {
                tree.unshift(info)
            }
        }

        return { tree }
    }

    // mkdir - 创建文件夹
    private async cmdMkdir(params: any): Promise<any> {
        const target = this.decode(params.target)
        const name = params.name
        const newDir = path.join(target, name)

        try {
            await fs.promises.mkdir(newDir)
            const info = await this.getFileInfo(newDir)
            return { added: [info] }
        } catch (error) {
            return { error: ['Error creating directory'] }
        }
    }

    // mkfile - 创建文件
    private async cmdMkfile(params: any): Promise<any> {
        const target = this.decode(params.target)
        const name = params.name
        const newFile = path.join(target, name)

        try {
            await fs.promises.writeFile(newFile, '')
            const info = await this.getFileInfo(newFile)
            return { added: [info] }
        } catch (error) {
            return { error: ['Error creating file'] }
        }
    }

    // rename - 重命名
    private async cmdRename(params: any): Promise<any> {
        const target = this.decode(params.target)
        const name = params.name
        const newPath = path.join(path.dirname(target), name)

        try {
            await fs.promises.rename(target, newPath)
            const info = await this.getFileInfo(newPath)
            return { added: [info], removed: [params.target] }
        } catch (error) {
            return { error: ['Error renaming'] }
        }
    }

    // rm - 删除
    private async cmdRm(params: any): Promise<any> {
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const removed: string[] = []

        for (const hash of targets) {
            const filePath = this.decode(hash)
            try {
                const stats = await fs.promises.stat(filePath)
                if (stats.isDirectory()) {
                    await fs.promises.rm(filePath, { recursive: true })
                } else {
                    await fs.promises.unlink(filePath)
                }
                removed.push(hash)
            } catch (error) {
                // 忽略错误，继续删除其他文件
            }
        }

        return { removed }
    }

    // paste - 复制/移动
    private async cmdPaste(params: any): Promise<any> {
        const dst = this.decode(params.dst)
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const cut = params.cut === '1'
        const added: any[] = []
        const removed: string[] = []

        for (const hash of targets) {
            const src = this.decode(hash)
            const name = path.basename(src)
            const dstPath = path.join(dst, name)

            try {
                if (cut) {
                    // 移动
                    await fs.promises.rename(src, dstPath)
                    removed.push(hash)
                } else {
                    // 复制
                    await this.copyRecursive(src, dstPath)
                }
                const info = await this.getFileInfo(dstPath)
                if (info) {
                    added.push(info)
                }
            } catch (error) {
                // 忽略错误
            }
        }

        return { added, removed: cut ? removed : [] }
    }

    private async copyRecursive(src: string, dst: string): Promise<void> {
        const stats = await fs.promises.stat(src)
        if (stats.isDirectory()) {
            await fs.promises.mkdir(dst, { recursive: true })
            const files = await fs.promises.readdir(src)
            for (const file of files) {
                await this.copyRecursive(path.join(src, file), path.join(dst, file))
            }
        } else {
            await fs.promises.copyFile(src, dst)
        }
    }

    // get - 获取文件内容
    private async cmdGet(params: any): Promise<any> {
        const target = this.decode(params.target)
        try {
            const content = await fs.promises.readFile(target, 'utf-8')
            return { content }
        } catch (error) {
            return { error: ['Error reading file'] }
        }
    }


    // upload - 上传文件
    private async cmdUpload(params: any): Promise<any> {
        // 这个会在路由中处理文件上传
        return { added: [] }
    }

    // file - 下载文件
    private async cmdFile(params: any): Promise<any> {
        const target = this.decode(params.target)
        return { path: target }
    }

    // duplicate - 创建副本
    private async cmdDuplicate(params: any): Promise<any> {
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const added: any[] = []

        for (const hash of targets) {
            if (!hash) continue
            const src = this.decode(hash)
            const dir = path.dirname(src)
            const ext = path.extname(src)
            const name = path.basename(src, ext)

            let newName = `${name} copy${ext}`
            let dest = path.join(dir, newName)
            let i = 1
            while (fs.existsSync(dest)) {
                newName = `${name} copy ${i}${ext}`
                dest = path.join(dir, newName)
                i++
            }

            try {
                await this.copyRecursive(src, dest)
                const info = await this.getFileInfo(dest)
                if (info) added.push(info)
            } catch (e) { }
        }
        return { added }
    }

    // info - 获取文件信息
    private async cmdInfo(params: any): Promise<any> {
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const files: any[] = []

        for (const hash of targets) {
            if (!hash) continue
            const filePath = this.decode(hash)
            const info = await this.getFileInfo(filePath)
            if (info) {
                files.push(info)
            }
        }
        return { files }
    }

    // search - 搜索
    private async cmdSearch(params: any): Promise<any> {
        const q = params.q
        const target = params.target ? this.decode(params.target) : this.root
        const files: any[] = []

        const searchDir = async (dir: string) => {
            try {
                const items = await fs.promises.readdir(dir)
                for (const item of items) {
                    if (item.startsWith('.')) continue
                    const itemPath = path.join(dir, item)
                    const stats = await fs.promises.stat(itemPath)

                    if (item.toLowerCase().includes(q.toLowerCase())) {
                        const info = await this.getFileInfo(itemPath)
                        if (info) files.push(info)
                    }

                    if (stats.isDirectory()) {
                        await searchDir(itemPath)
                    }
                }
            } catch { }
        }

        await searchDir(target)
        return { files }
    }

    // dim - 获取图片尺寸 (stub)
    private async cmdDim(params: any): Promise<any> {
        const target = this.decode(params.target)
        return { dim: '0x0' }
    }

    // resize - 调整图片尺寸 (stub)
    private async cmdResize(params: any): Promise<any> {
        return { error: ['Not implemented'] }
    }

    // url - 获取文件URL
    private async cmdUrl(params: any): Promise<any> {
        const target = this.decode(params.target)
        const relative = path.relative(this.root, target)
        // 构造一个指向 /api/files/download 的 URL，或者直接指向静态资源
        // 这里我们使用 connector 的 file 命令
        // 注意：这里无法直接获取 auth，所以前端最好配置 url 选项
        // 但如果前端请求 url 命令，我们返回一个带 path 的链接
        return { url: `/api/v1/admin/elfinder/connector?cmd=file&target=${params.target}` }
    }

    // archive - 创建压缩包
    private async cmdArchive(params: any): Promise<any> {
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const name = params.name || 'archive.zip'
        const type = params.type || 'application/zip'

        if (type !== 'application/zip') {
            return { error: ['Unsupported archive type'] }
        }

        // 确定目标目录（第一个文件的父目录）
        const firstFile = this.decode(targets[0])
        const dir = path.dirname(firstFile)
        const archivePath = path.join(dir, name)

        const output = fs.createWriteStream(archivePath)
        const archive = new ZipArchive({ zlib: { level: 9 } })

        return new Promise((resolve, reject) => {
            output.on('close', async () => {
                const info = await this.getFileInfo(archivePath)
                resolve({ added: [info] })
            })

            archive.on('error', (err: any) => {
                reject({ error: [err.message] })
            })

            archive.pipe(output)

            for (const hash of targets) {
                const filePath = this.decode(hash)
                const stats = fs.statSync(filePath)
                const fileName = path.basename(filePath)

                if (stats.isDirectory()) {
                    archive.directory(filePath, fileName)
                } else {
                    archive.file(filePath, { name: fileName })
                }
            }

            archive.finalize()
        })
    }

    // extract - 解压
    private async cmdExtract(params: any): Promise<any> {
        const target = this.decode(params.target)
        const makedir = params.makedir === '1'
        const dir = path.dirname(target)

        // 如果需要创建文件夹
        let extractPath = dir
        if (makedir) {
            const folderName = path.basename(target, path.extname(target))
            extractPath = path.join(dir, folderName)
            if (!fs.existsSync(extractPath)) {
                fs.mkdirSync(extractPath)
            }
        }

        return new Promise((resolve, reject) => {
            fs.createReadStream(target)
                .pipe(unzipper.Extract({ path: extractPath }))
                .on('close', async () => {
                    // 简单起见，返回解压目录的信息，或者强制刷新
                    // elFinder 期望返回 added 列表，这里我们返回解压后的根目录（如果是 makedir）或父目录的更新
                    if (makedir) {
                        const info = await this.getFileInfo(extractPath)
                        resolve({ added: [info] })
                    } else {
                        // 如果解压到当前目录，很难知道增加了哪些文件，通常返回空 added 并让前端刷新
                        // 或者我们可以尝试列出目录
                        resolve({ added: [] }) // 前端可能不会自动刷新，但至少操作完成了
                    }
                })
                .on('error', (err: any) => {
                    reject({ error: [err.message] })
                })
        })
    }

    // size - 获取大小
    private async cmdSize(params: any): Promise<any> {
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        let totalSize = 0

        const getSize = async (p: string): Promise<number> => {
            try {
                const stats = await fs.promises.stat(p)
                if (stats.isDirectory()) {
                    const files = await fs.promises.readdir(p)
                    let size = 0
                    for (const f of files) {
                        size += await getSize(path.join(p, f))
                    }
                    return size
                } else {
                    return stats.size
                }
            } catch {
                return 0
            }
        }

        for (const hash of targets) {
            const p = this.decode(hash)
            totalSize += await getSize(p)
        }

        return { size: totalSize }
    }

    // zipdl - 打包下载
    private async cmdZipdl(params: any): Promise<any> {
        if (params.download === '1') {
            // 下载阶段
            const target = this.decode(params.target)
            return { path: target }
        }

        // 准备阶段
        const targets = Array.isArray(params['targets[]']) ? params['targets[]'] : [params['targets[]']]
        const zipName = 'download.zip'
        const tempDir = require('os').tmpdir()
        const zipPath = path.join(tempDir, `elfinder_zipdl_${Date.now()}_${Math.random().toString(36).substr(2)}.zip`)

        const output = fs.createWriteStream(zipPath)
        const archive = new ZipArchive({ zlib: { level: 1 } })

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                resolve({
                    zipdl: {
                        file: 'TMP_' + Buffer.from(zipPath).toString('base64'),
                        name: zipName,
                        mime: 'application/zip'
                    }
                })
            })

            archive.on('error', (err: any) => {
                reject({ error: [err.message] })
            })

            archive.pipe(output)

            for (const hash of targets) {
                const filePath = this.decode(hash)
                try {
                    const stats = fs.statSync(filePath)
                    const name = path.basename(filePath)
                    if (stats.isDirectory()) {
                        archive.directory(filePath, name)
                    } else {
                        archive.file(filePath, { name })
                    }
                } catch (e) { }
            }

            archive.finalize()
        })
    }



    // put - 保存文件内容
    private async cmdPut(params: any): Promise<any> {
        const target = this.decode(params.target)
        const content = params.content
        try {
            await fs.promises.writeFile(target, content)
            const info = await this.getFileInfo(target)
            return { changed: [info] }
        } catch (e) {
            return { error: ['errPut', 'Write failed'] }
        }
    }
}

export function getSystemRoot(): string {
    return process.cwd()
}

export function getDataFolder(): string {
    return global.lx?.userPath || path.join(process.cwd(), 'data')
}
