import React, { useEffect, useState } from 'react'
import { getSystemStats, SystemStats, isTauri } from './tauri'

interface Props {
  /** 气泡/面板显示在角色上方(true)还是下方(false) */
  below?: boolean
}

/** 时钟/日期 + 系统资源信息面板。 */
export function InfoPanel({ below }: Props) {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [stats, setStats] = useState<SystemStats | null>(null)

  // 时钟：每秒更新
  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      )
      const wd = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
      setDate(`${now.getMonth() + 1}月${now.getDate()}日 周${wd}`)
    }
    fmt()
    const t = window.setInterval(fmt, 1000)
    return () => window.clearInterval(t)
  }, [])

  // 系统资源：每 2 秒刷新
  useEffect(() => {
    if (!isTauri()) return
    let alive = true
    const poll = async () => {
      const s = await getSystemStats()
      if (alive && s) setStats(s)
    }
    void poll()
    const t = window.setInterval(poll, 5000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [])

  return (
    <div className={`wg-info${below ? ' wg-info-below' : ''}`}>
      <div className="wg-info-time">{time}</div>
      <div className="wg-info-date">{date}</div>
      {stats && (
        <>
          <div className="wg-info-row">
            <span className="wg-info-label">CPU</span>
            <div className="wg-info-bar">
              <div className="wg-info-fill" style={{ width: `${Math.min(100, stats.cpu)}%` }} />
            </div>
            <span className="wg-info-val">{stats.cpu}%</span>
          </div>
          <div className="wg-info-row">
            <span className="wg-info-label">内存</span>
            <div className="wg-info-bar">
              <div className="wg-info-fill" style={{ width: `${Math.min(100, stats.memPct)}%` }} />
            </div>
            <span className="wg-info-val">{stats.memPct}%</span>
          </div>
        </>
      )}
    </div>
  )
}
