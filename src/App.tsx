import React, { useCallback, useEffect, useRef, useState } from 'react'
import { WhaleWidget, WhaleWidgetHandle, DeskConfig } from './WhaleWidget'
import { WIDGET_CSS } from './styles'
import {
  isTauri,
  hideToTray,
  quitApp,
  toggleAlwaysOnTop,
  getAlwaysOnTop,
  setAutoLaunch,
  getAutoLaunch
} from './tauri'

interface MenuState {
  x: number
  y: number
}

const CONFIG_KEY = 'whale-girl-desktop-config'
const DEFAULT_CONFIG: DeskConfig = { soundMode: 'cute', showBubble: true, showInfo: true }

function loadConfig(): DeskConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULT_CONFIG
    const o = JSON.parse(raw) as Partial<DeskConfig>
    return {
      soundMode: o.soundMode === 'duck' ? 'duck' : 'cute',
      showBubble: o.showBubble !== false,
      showInfo: o.showInfo !== false
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export default function App() {
  const widgetRef = useRef<WhaleWidgetHandle>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [alwaysOnTop, setAlwaysOnTop] = useState(true)
  const [autoLaunch, setAutoLaunchState] = useState(false)
  const [config, setConfig] = useState<DeskConfig>(loadConfig)

  // 读取初始设置（仅 Tauri 环境）
  useEffect(() => {
    if (!isTauri()) return
    let alive = true
    Promise.all([getAlwaysOnTop(), getAutoLaunch()])
      .then(([top, auto]) => {
        if (!alive) return
        setAlwaysOnTop(top)
        setAutoLaunchState(auto)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 保存配置
  const persistConfig = useCallback((next: DeskConfig) => {
    setConfig(next)
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  // 点击空白关闭菜单
  const onGlobalClick = useCallback(() => setMenu(null), [])

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const onToggleTop = useCallback(async () => {
    const next = await toggleAlwaysOnTop()
    setAlwaysOnTop(next)
    setMenu(null)
  }, [])

  const onToggleAutoLaunch = useCallback(async () => {
    const next = !autoLaunch
    await setAutoLaunch(next)
    setAutoLaunchState(next)
    setMenu(null)
  }, [autoLaunch])

  const onSetSound = useCallback(
    (mode: DeskConfig['soundMode']) => {
      persistConfig({ ...config, soundMode: mode })
      setMenu(null)
    },
    [config, persistConfig]
  )

  const onToggleBubble = useCallback(() => {
    persistConfig({ ...config, showBubble: !config.showBubble })
    setMenu(null)
  }, [config, persistConfig])

  const onToggleInfo = useCallback(() => {
    persistConfig({ ...config, showInfo: !config.showInfo })
    setMenu(null)
  }, [config, persistConfig])

  const onResetPosition = useCallback(() => {
    widgetRef.current?.resetPosition()
    setMenu(null)
  }, [])

  const onHide = useCallback(async () => {
    setMenu(null)
    await hideToTray()
  }, [])

  const onQuit = useCallback(async () => {
    setMenu(null)
    await quitApp()
  }, [])

  return (
    <div className="wg-app" onClick={onGlobalClick}>
      <style>{WIDGET_CSS}</style>
      <WhaleWidget ref={widgetRef} config={config} onContextMenu={openMenu} />
      {menu && (
        <div
          className="wg-menu wg-desk-menu"
          style={{
            left: Math.max(8, Math.min(menu.x, window.innerWidth - 200)),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - 400))
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wg-menu-title">鲸鱼娘桌宠</div>
          <div className="wg-menu-title">音效</div>
          <div className="wg-menu-item" onClick={() => onSetSound('cute')}>
            <span className={`wg-menu-radio${config.soundMode === 'cute' ? ' on' : ''}`} /> 可爱合成音
          </div>
          <div className="wg-menu-item" onClick={() => onSetSound('duck')}>
            <span className={`wg-menu-radio${config.soundMode === 'duck' ? ' on' : ''}`} /> 鸭叫
          </div>
          <div className="wg-menu-divider" />
          <div className="wg-menu-title">显示模块</div>
          <div className="wg-menu-item" onClick={onToggleBubble}>
            <span className={`wg-menu-check${config.showBubble ? ' on' : ''}`} /> 彩蛋气泡
          </div>
          <div className="wg-menu-item" onClick={onToggleInfo}>
            <span className={`wg-menu-check${config.showInfo ? ' on' : ''}`} /> 信息面板(时间/资源)
          </div>
          <div className="wg-menu-divider" />
          <div className="wg-menu-item" onClick={onResetPosition}>↺ 恢复默认位置</div>
          <div className="wg-menu-divider" />
          <div className="wg-menu-item" onClick={onToggleTop}>
            <span className={`wg-menu-check${alwaysOnTop ? ' on' : ''}`} /> 置顶显示
          </div>
          <div className="wg-menu-item" onClick={onToggleAutoLaunch}>
            <span className={`wg-menu-check${autoLaunch ? ' on' : ''}`} /> 开机自启
          </div>
          <div className="wg-menu-divider" />
          <div className="wg-menu-item" onClick={onHide}>隐藏到托盘</div>
          <div className="wg-menu-item" onClick={onQuit}>退出</div>
        </div>
      )}
    </div>
  )
}
