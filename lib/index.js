/**
 * @najie/storage-cos
 * 云存储（COS）子应用
 */

// 配置管理
export { loadConfig, saveConfig, getConfigPath } from './config.js'

// COS 操作
export {
  testConnection,
  uploadFile,
  downloadFile,
  listFiles,
  deleteFile,
  getFileUrl
} from './cos.js'
