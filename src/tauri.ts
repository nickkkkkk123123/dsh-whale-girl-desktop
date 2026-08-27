// Tauri 桥接：封装与 Rust 后端的命令调用。
// 非 Tauri 环境（浏览器预览）下优雅降级为 no-op。

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

let invokeFn: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null

/** 动态解析 Tauri invoke（避免顶层 import 在非 Tauri 环境报错）。 */
async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  if (!invokeFn) {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const mod = await import('@tauri-apps/api/core')
      invokeFn = mod.invoke
    } else {
      return null
    }
  }
  return invokeFn(cmd, args)
}

export const isTauri = () =>
  typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

export async function hideToTray(): Promise<void> {
  await invoke('hide_to_tray')
}

export async function quitApp(): Promise<void> {
  await invoke('quit_app')
}

export async function toggleAlwaysOnTop(): Promise<boolean> {
  const r = await invoke('toggle_always_on_top')
  return r === true
}

export async function getAlwaysOnTop(): Promise<boolean> {
  const r = await invoke('get_always_on_top')
  return r === true
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  await invoke('set_auto_launch', { enabled })
}

export async function getAutoLaunch(): Promise<boolean> {
  const r = await invoke('get_auto_launch')
  return r === true
}

/** 移动窗口到指定屏幕坐标（左上角）。 */
export async function setWindowPosition(x: number, y: number): Promise<void> {
  await invoke('set_window_position', { x: Math.round(x), y: Math.round(y) })
}

/** 节流移动窗口：同一帧内的多次调用合并为一次 IPC，避免 60fps 高频命令堆积导致抖动/滞后。 */
let pendingPos: { x: number; y: number } | null = null
let moving = false
export function moveWindow(x: number, y: number): void {
  pendingPos = { x, y }
  if (moving) return
  moving = true
  const flush = async () => {
    const p = pendingPos
    pendingPos = null
    if (p) await setWindowPosition(p.x, p.y)
    moving = false
    if (pendingPos) flush()
  }
  void flush()
}

/** 获取当前显示器工作区尺寸。 */
export async function getScreenSize(): Promise<{ w: number; h: number } | null> {
  const r = await invoke('get_screen_size')
  return (r as { w: number; h: number } | null) ?? null
}

export interface SystemStats {
  cpu: number
  memTotal: number
  memUsed: number
  memPct: number
}

/** 获取系统资源（CPU/内存）。非 Tauri 环境返回 null。 */
export async function getSystemStats(): Promise<SystemStats | null> {
  const r = await invoke('get_system_stats')
  return (r as SystemStats | null) ?? null
}
