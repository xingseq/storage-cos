#!/usr/bin/env node
/**
 * najie-storage-cos CLI 入口
 * 云存储（COS）- 腾讯云对象存储服务
 */
import { Command } from 'commander'
import { loadConfig, saveConfig, getConfigPath } from '../lib/config.js'
import { testConnection, listFiles, uploadFile, downloadFile, deleteFile, getFileUrl } from '../lib/cos.js'
import { createServer } from '../lib/server.js'
import path from 'path'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'

const program = new Command()

program
  .name('najie-storage-cos')
  .description('云存储（COS）- 腾讯云对象存储服务')
  .version('0.1.0')

// ==================== 配置命令组 ====================
const config = new Command('config').description('管理 COS 配置')

config
  .command('set')
  .description('设置 COS 配置')
  .option('--secretId <secretId>', '腾讯云 SecretId')
  .option('--secretKey <secretKey>', '腾讯云 SecretKey')
  .option('--bucket <bucket>', '存储桶名称')
  .option('--region <region>', '地域')
  .action(async (options) => {
    const current = (await loadConfig()).data || {}
    const newConfig = {
      secretId: options.secretId || current.secretId || '',
      secretKey: options.secretKey || current.secretKey || '',
      bucket: options.bucket || current.bucket || '',
      region: options.region || current.region || '',
    }
    
    const result = await saveConfig(newConfig)
    if (result.success) {
      console.log('✓ COS 配置已保存')
      console.log(`  配置文件: ${getConfigPath()}`)
    } else {
      console.error(`✗ 保存失败: ${result.error}`)
      process.exit(1)
    }
  })

config
  .command('show')
  .description('显示当前配置')
  .action(async () => {
    const result = await loadConfig()
    if (result.success && result.data) {
      console.log('当前 COS 配置:')
      console.log(`  SecretId: ${result.data.secretId ? result.data.secretId.slice(0, 8) + '****' : '(未配置)'}`)
      console.log(`  SecretKey: ${result.data.secretKey ? '********' : '(未配置)'}`)
      console.log(`  Bucket: ${result.data.bucket || '(未配置)'}`)
      console.log(`  Region: ${result.data.region || '(未配置)'}`)
      console.log(`  配置文件: ${getConfigPath()}`)
    } else {
      console.log('尚未配置 COS，请运行: najie-storage-cos config set')
    }
  })

config
  .command('test')
  .description('测试 COS 连接')
  .action(async () => {
    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      console.error('尚未配置 COS，请先运行: najie-storage-cos config set')
      process.exit(1)
    }
    
    console.log('测试 COS 连接...')
    const result = await testConnection(configResult.data)
    if (result.success) {
      console.log('✓ COS 连接成功')
    } else {
      console.error(`✗ 连接失败: ${result.error}`)
      process.exit(1)
    }
  })

program.addCommand(config)

// ==================== 文件操作命令 ====================

program
  .command('ls')
  .description('列出存储桶文件')
  .option('--prefix <prefix>', '前缀过滤')
  .option('--limit <n>', '显示数量', '100')
  .action(async (options) => {
    const result = await listFiles(options.prefix || '', parseInt(options.limit))
    if (result.success) {
      if (result.files.length === 0) {
        console.log('存储桶为空')
      } else {
        console.log(`共 ${result.files.length} 个文件:`)
        result.files.forEach((file) => {
          const size = formatSize(file.size)
          console.log(`  ${file.key} (${size})`)
        })
      }
    } else {
      console.error(`✗ 获取文件列表失败: ${result.error}`)
      process.exit(1)
    }
  })

program
  .command('upload <file>')
  .description('上传文件')
  .option('--key <key>', 'COS 对象键（默认使用文件名）')
  .action(async (file, options) => {
    const filePath = path.resolve(file)
    if (!fs.existsSync(filePath)) {
      console.error(`✗ 文件不存在: ${filePath}`)
      process.exit(1)
    }
    
    const key = options.key || path.basename(filePath)
    console.log(`上传文件: ${filePath} -> ${key}`)
    
    const result = await uploadFile(filePath, key, (progress) => {
      process.stdout.write(`\r进度: ${progress.percent}%`)
    })
    
    console.log() // 换行
    if (result.success) {
      console.log('✓ 上传成功')
      console.log(`  位置: ${result.data.location}`)
    } else {
      console.error(`✗ 上传失败: ${result.error}`)
      process.exit(1)
    }
  })

program
  .command('download <key>')
  .description('下载文件')
  .option('--output <path>', '输出路径（默认当前目录）')
  .action(async (key, options) => {
    const outputPath = options.output || path.join(process.cwd(), path.basename(key))
    console.log(`下载文件: ${key} -> ${outputPath}`)
    
    const result = await downloadFile(key, outputPath)
    if (result.success) {
      console.log('✓ 下载成功')
    } else {
      console.error(`✗ 下载失败: ${result.error}`)
      process.exit(1)
    }
  })

program
  .command('rm <key>')
  .description('删除文件')
  .action(async (key) => {
    console.log(`删除文件: ${key}`)
    const result = await deleteFile(key)
    if (result.success) {
      console.log('✓ 删除成功')
    } else {
      console.error(`✗ 删除失败: ${result.error}`)
      process.exit(1)
    }
  })

program
  .command('url <key>')
  .description('获取文件访问 URL')
  .option('--expires <seconds>', '过期时间（秒）', '3600')
  .action(async (key, options) => {
    const result = await getFileUrl(key, parseInt(options.expires))
    if (result.success) {
      console.log(result.url)
    } else {
      console.error(`✗ 获取 URL 失败: ${result.error}`)
      process.exit(1)
    }
  })

// ==================== 服务命令 ====================

program
  .command('serve')
  .description('启动 Web UI 服务')
  .option('--port <port>', '端口号', '5175')
  .option('--stop', '停止服务')
  .action(async (options) => {
    const pidFile = path.join(os.tmpdir(), 'najie-storage-cos.pid')
    
    if (options.stop) {
      // 停止服务
      if (fs.existsSync(pidFile)) {
        const pid = fs.readFileSync(pidFile, 'utf-8').trim()
        try {
          process.kill(parseInt(pid))
          fs.unlinkSync(pidFile)
          console.log('✓ 服务已停止')
        } catch (err) {
          fs.unlinkSync(pidFile)
          console.log('服务未运行')
        }
      } else {
        console.log('服务未运行')
      }
      return
    }
    
    // 启动服务
    const port = parseInt(options.port)
    
    // 保存 PID
    fs.writeFileSync(pidFile, process.pid.toString())
    
    createServer(port)
  })

// ==================== 辅助函数 ====================

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

program.parse()
