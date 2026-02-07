/**
 * API 服务器 - 为 Web UI 提供 HTTP 接口
 * 启动命令: najie-storage-cos serve
 */
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import path from 'path'
import { loadConfig, saveConfig } from './config.js'
import { testConnection, listFiles, uploadFile, downloadFile, deleteFile, getFileUrl } from './cos.js'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 创建 API 服务器
 * @param {number} port - 端口号
 */
export function createServer(port = 5175) {
  const app = express()
  
  app.use(cors())
  app.use(express.json())
  
  // ==================== 配置 API ====================
  
  // 获取配置
  app.get('/api/config', async (req, res) => {
    try {
      const result = await loadConfig()
      if (result.success && result.data) {
        // 隐藏密钥
        const safeConfig = { ...result.data }
        if (safeConfig.secretKey) {
          safeConfig.secretKey = '********'
        }
        res.json({ success: true, config: safeConfig })
      } else {
        res.json({ success: true, config: null })
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // 保存配置
  app.post('/api/config', async (req, res) => {
    try {
      const config = req.body
      // 如果密钥是 ******** 说明没有修改，需要保留原来的
      if (config.secretKey === '********') {
        const oldConfig = await loadConfig()
        if (oldConfig.success && oldConfig.data) {
          config.secretKey = oldConfig.data.secretKey
        }
      }
      const result = await saveConfig(config)
      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // 测试连接
  app.post('/api/config/test', async (req, res) => {
    try {
      const config = req.body
      // 如果密钥是 ******** 说明需要用已保存的
      if (config.secretKey === '********') {
        const oldConfig = await loadConfig()
        if (oldConfig.success && oldConfig.data) {
          config.secretKey = oldConfig.data.secretKey
        }
      }
      const result = await testConnection(config)
      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // ==================== 文件 API ====================
  
  // 列出文件
  app.get('/api/files', async (req, res) => {
    try {
      const { prefix, limit } = req.query
      const result = await listFiles(prefix || '', parseInt(limit) || 1000)
      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // 获取文件 URL
  app.get('/api/files/url', async (req, res) => {
    try {
      const { key, expires } = req.query
      if (!key) {
        return res.status(400).json({ success: false, error: '缺少 key 参数' })
      }
      const result = await getFileUrl(key, parseInt(expires) || 3600)
      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // 删除文件
  app.delete('/api/files/:key(*)', async (req, res) => {
    try {
      const { key } = req.params
      const result = await deleteFile(key)
      res.json(result)
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  })
  
  // ==================== 静态文件 ====================
  
  // 静态文件服务（UI）
  const distPath = path.join(__dirname, '../ui/dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
  
  // 启动服务器
  const server = app.listen(port, () => {
    console.log(`云存储（COS）服务已启动: http://localhost:${port}`)
  })
  
  return server
}
