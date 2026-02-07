/**
 * 云存储（COS）- Web UI
 */
import { useState, useEffect } from 'react'
import { Cloud, Settings, RefreshCw, Trash2, Download, Copy, Check, AlertCircle, FileText, Image, Archive, Film, Music } from 'lucide-react'

const API_BASE = '/api'

// ==================== 主应用 ====================

export default function App() {
  const [tab, setTab] = useState('files')
  const [darkMode, setDarkMode] = useState(false)
  
  useEffect(() => {
    // 检测系统主题
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mediaQuery.matches)
    
    const handler = (e) => setDarkMode(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* 头部 */}
      <header className="sticky top-0 z-50 glass-effect border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text">云存储</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tencent COS</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl">
            <TabButton 
              active={tab === 'files'} 
              onClick={() => setTab('files')}
              icon={<Cloud className="w-4 h-4" />}
              label="文件"
            />
            <TabButton 
              active={tab === 'config'} 
              onClick={() => setTab('config')}
              icon={<Settings className="w-4 h-4" />}
              label="配置"
            />
          </nav>
        </div>
      </header>
      
      {/* 内容 */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'files' ? <FilesPage /> : <ConfigPage />}
      </main>
      
      {/* 底部 */}
      <footer className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        腾讯云对象存储服务
      </footer>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
        active 
          ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {icon} {label}
    </button>
  )
}

// ==================== 文件页面 ====================

function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  
  const loadFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/files`)
      const data = await res.json()
      if (data.success) {
        setFiles(data.files || [])
      } else {
        setError(data.error || '获取文件列表失败')
      }
    } catch (err) {
      setError('无法连接到服务器，请检查 COS 配置')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadFiles()
  }, [])
  
  const handleDelete = async (key) => {
    if (!confirm(`确定要删除 "${key}" 吗？`)) return
    
    try {
      const res = await fetch(`${API_BASE}/files/${encodeURIComponent(key)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setFiles(files.filter(f => f.key !== key))
      } else {
        alert(`删除失败: ${data.error}`)
      }
    } catch (err) {
      alert(`删除失败: ${err.message}`)
    }
  }
  
  const handleCopyUrl = async (key) => {
    try {
      const res = await fetch(`${API_BASE}/files/url?key=${encodeURIComponent(key)}&expires=3600`)
      const data = await res.json()
      if (data.success && data.url) {
        await navigator.clipboard.writeText(data.url)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
      } else {
        alert(`获取 URL 失败: ${data.error}`)
      }
    } catch (err) {
      alert(`获取 URL 失败: ${err.message}`)
    }
  }
  
  const handleDownload = async (key) => {
    try {
      const res = await fetch(`${API_BASE}/files/url?key=${encodeURIComponent(key)}&expires=3600`)
      const data = await res.json()
      if (data.success && data.url) {
        window.open(data.url, '_blank')
      } else {
        alert(`获取下载链接失败: ${data.error}`)
      }
    } catch (err) {
      alert(`获取下载链接失败: ${err.message}`)
    }
  }
  
  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          请先在「配置」页面设置 COS 账号信息
        </p>
        <button onClick={loadFiles} className="btn-secondary">
          重试
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          文件列表 ({files.length})
        </h2>
        <button onClick={loadFiles} className="btn-ghost flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>
      
      {/* 文件列表 */}
      {files.length === 0 ? (
        <div className="card text-center py-12">
          <Cloud className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">存储桶为空</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {files.map((file) => (
              <FileItem 
                key={file.key} 
                file={file}
                onDelete={() => handleDelete(file.key)}
                onCopyUrl={() => handleCopyUrl(file.key)}
                onDownload={() => handleDownload(file.key)}
                copied={copiedKey === file.key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FileItem({ file, onDelete, onCopyUrl, onDownload, copied }) {
  const getFileIcon = (key) => {
    const ext = key.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <Image className="w-5 h-5 text-green-500" />
    }
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
      return <Film className="w-5 h-5 text-purple-500" />
    }
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
      return <Music className="w-5 h-5 text-pink-500" />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-5 h-5 text-amber-500" />
    }
    return <FileText className="w-5 h-5 text-blue-500" />
  }
  
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {getFileIcon(file.key)}
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
          {file.key}
        </div>
        <div className="text-sm text-gray-500">
          {formatSize(file.size)} · {formatDate(file.lastModified)}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={onCopyUrl}
          className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          title="复制链接"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <button 
          onClick={onDownload}
          className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          title="下载"
        >
          <Download className="w-4 h-4" />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ==================== 配置页面 ====================

function ConfigPage() {
  const [config, setConfig] = useState({
    secretId: '',
    secretKey: '',
    bucket: '',
    region: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState(null)
  
  useEffect(() => {
    loadConfig()
  }, [])
  
  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`)
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
      }
    } catch (err) {
      console.error('加载配置失败:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }
  
  const handleSave = async () => {
    if (!config.secretId || !config.secretKey || !config.bucket || !config.region) {
      showMessage('error', '请填写完整的配置信息')
      return
    }
    
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        showMessage('success', '配置已保存')
      } else {
        showMessage('error', data.error || '保存失败')
      }
    } catch (err) {
      showMessage('error', `保存失败: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }
  
  const handleTest = async () => {
    if (!config.secretId || !config.secretKey || !config.bucket || !config.region) {
      showMessage('error', '请先填写完整的配置信息')
      return
    }
    
    setTesting(true)
    try {
      const res = await fetch(`${API_BASE}/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        showMessage('success', '连接测试成功')
      } else {
        showMessage('error', data.error || '连接测试失败')
      }
    } catch (err) {
      showMessage('error', `测试失败: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        COS 配置
      </h2>
      
      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* 配置表单 */}
      <div className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SecretId
          </label>
          <input
            type="text"
            value={config.secretId}
            onChange={(e) => setConfig({ ...config, secretId: e.target.value })}
            placeholder="请输入腾讯云 SecretId"
            className="input-field"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SecretKey
          </label>
          <input
            type="password"
            value={config.secretKey}
            onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
            placeholder="请输入腾讯云 SecretKey"
            className="input-field"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bucket（存储桶名称）
          </label>
          <input
            type="text"
            value={config.bucket}
            onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
            placeholder="例如: my-bucket-1234567890"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">格式：BucketName-APPID</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region（地域）
          </label>
          <input
            type="text"
            value={config.region}
            onChange={(e) => setConfig({ ...config, region: e.target.value })}
            placeholder="例如: ap-guangzhou"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">
            常用地域：ap-guangzhou（广州）、ap-shanghai（上海）、ap-beijing（北京）
          </p>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !config.secretId || !config.bucket}
            className="btn-secondary"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
      </div>
      
      {/* 使用说明 */}
      <div className="card bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">使用说明</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>• 在腾讯云控制台获取 SecretId 和 SecretKey（建议使用子账号密钥）</li>
          <li>• Bucket 格式为：存储桶名称-APPID，例如：my-bucket-1234567890</li>
          <li>• 建议在腾讯云控制台为 Bucket 配置合适的访问权限</li>
        </ul>
      </div>
    </div>
  )
}
