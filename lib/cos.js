/**
 * COS 操作核心模块
 */
import COS from 'cos-nodejs-sdk-v5'
import { loadConfig } from './config.js'
import path from 'path'
import fs from 'fs'
import { createReadStream, createWriteStream } from 'fs'

let cosInstance = null

/**
 * 初始化 COS 实例
 * @param {object} config - 可选的配置覆盖
 * @returns {Promise<{success: boolean, cos?: COS, error?: string}>}
 */
async function initCOS(config = null) {
  try {
    const cfg = config || (await loadConfig()).data
    if (!cfg) {
      return { success: false, error: 'COS 配置未找到' }
    }

    const { secretId, secretKey } = cfg
    if (!secretId || !secretKey) {
      return { success: false, error: 'COS 密钥未配置' }
    }

    cosInstance = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    })

    return { success: true, cos: cosInstance }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 测试 COS 连接
 * @param {object} config - COS 配置
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function testConnection(config) {
  try {
    const initResult = await initCOS(config)
    if (!initResult.success) {
      return initResult
    }

    const { bucket, region } = config
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    // 尝试获取 Bucket 信息来验证连接
    return new Promise((resolve) => {
      cosInstance.headBucket(
        { Bucket: bucket, Region: region },
        (err) => {
          if (err) {
            resolve({ success: false, error: err.message })
          } else {
            resolve({ success: true })
          }
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 上传文件到 COS
 * @param {string} filePath - 本地文件路径
 * @param {string} key - COS 对象键
 * @param {function} onProgress - 进度回调
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function uploadFile(filePath, key, onProgress) {
  try {
    const initResult = await initCOS()
    if (!initResult.success) {
      return initResult
    }

    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: '加载 COS 配置失败' }
    }

    const { bucket, region } = configResult.data
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `文件不存在: ${filePath}` }
    }

    // 如果没有指定 key，使用文件名
    if (!key) {
      key = path.basename(filePath)
    }

    return new Promise((resolve) => {
      cosInstance.putObject(
        {
          Bucket: bucket,
          Region: region,
          Key: key,
          Body: createReadStream(filePath),
          onProgress: (progressData) => {
            if (onProgress) {
              const percent = Math.round(progressData.percent * 100 * 100) / 100
              onProgress({
                percent,
                loaded: progressData.loaded,
                total: progressData.total,
              })
            }
          },
        },
        (err, data) => {
          if (err) {
            resolve({ success: false, error: err.message })
          } else {
            resolve({
              success: true,
              data: {
                location: data.Location,
                etag: data.ETag,
                key: key,
              },
            })
          }
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 下载文件
 * @param {string} key - COS 对象键
 * @param {string} outputPath - 输出路径
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function downloadFile(key, outputPath) {
  try {
    const initResult = await initCOS()
    if (!initResult.success) {
      return initResult
    }

    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: '加载 COS 配置失败' }
    }

    const { bucket, region } = configResult.data
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    return new Promise((resolve) => {
      cosInstance.getObject(
        {
          Bucket: bucket,
          Region: region,
          Key: key,
          Output: createWriteStream(outputPath),
        },
        (err) => {
          if (err) {
            resolve({ success: false, error: err.message })
          } else {
            resolve({
              success: true,
              data: { key, outputPath },
            })
          }
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 列出文件
 * @param {string} prefix - 前缀过滤
 * @param {number} limit - 数量限制
 * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
 */
export async function listFiles(prefix = '', limit = 1000) {
  try {
    const initResult = await initCOS()
    if (!initResult.success) {
      return initResult
    }

    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: '加载 COS 配置失败' }
    }

    const { bucket, region } = configResult.data
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    return new Promise((resolve) => {
      cosInstance.getBucket(
        {
          Bucket: bucket,
          Region: region,
          Prefix: prefix,
          MaxKeys: limit,
        },
        (err, data) => {
          if (err) {
            resolve({ success: false, error: err.message })
          } else {
            const files = (data.Contents || []).map((item) => ({
              key: item.Key,
              size: parseInt(item.Size, 10),
              lastModified: item.LastModified,
              etag: item.ETag,
            }))
            resolve({ success: true, files })
          }
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 删除文件
 * @param {string} key - COS 对象键
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFile(key) {
  try {
    const initResult = await initCOS()
    if (!initResult.success) {
      return initResult
    }

    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: '加载 COS 配置失败' }
    }

    const { bucket, region } = configResult.data
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    return new Promise((resolve) => {
      cosInstance.deleteObject(
        {
          Bucket: bucket,
          Region: region,
          Key: key,
        },
        (err) => {
          if (err) {
            resolve({ success: false, error: err.message })
          } else {
            resolve({ success: true })
          }
        }
      )
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取文件访问 URL
 * @param {string} key - COS 对象键
 * @param {number} expires - 过期时间（秒）
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function getFileUrl(key, expires = 3600) {
  try {
    const initResult = await initCOS()
    if (!initResult.success) {
      return initResult
    }

    const configResult = await loadConfig()
    if (!configResult.success || !configResult.data) {
      return { success: false, error: '加载 COS 配置失败' }
    }

    const { bucket, region } = configResult.data
    if (!bucket || !region) {
      return { success: false, error: 'Bucket 或 Region 未配置' }
    }

    const url = cosInstance.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Key: key,
      Sign: true,
      Expires: expires,
    })

    return { success: true, url }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
