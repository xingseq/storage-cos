/**
 * COS 配置管理
 */
import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.najie')
const CONFIG_FILE = path.join(CONFIG_DIR, 'storage-cos.json')

/**
 * 确保配置目录存在
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/**
 * 加载 COS 配置
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function loadConfig() {
  try {
    ensureConfigDir()
    if (!fs.existsSync(CONFIG_FILE)) {
      return { success: true, data: null }
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const data = JSON.parse(content)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 保存 COS 配置
 * @param {object} config - 配置对象
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveConfig(config) {
  try {
    ensureConfigDir()
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 获取配置文件路径
 * @returns {string}
 */
export function getConfigPath() {
  return CONFIG_FILE
}
