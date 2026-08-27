import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { WIDGET_CSS } from './styles'
import { Bubble } from './components/Bubble'
import { EasterEgg } from './EasterEgg'
import { pickRandomIdleLine } from './quotes'
import { SoundEngine, SoundMode } from './SoundEngine'
import { FlingTracker, startFling } from './PhysicsFling'
import { WHALE_GIRL_DATA_URL } from './whaleDataUrl'
import { RUA_GIF_URL } from './ruaDataUrl'
import { InfoPanel } from './InfoPanel'
import { moveWindow, getScreenSize, isTauri } from './tauri'

const WIDGET_W = 170
const WIDGET_H = 180
/** 窗口（含气泡空间与菜单空间）尺寸。 */
const WIN_W = 320
const WIN_H = 560
/** 角色在窗口内的偏移（角色居中水平；垂直置于窗口中下部，上下都留气泡空间）。 */
const ROLE_OFFSET_X = (WIN_W - WIDGET_W) / 2
const ROLE_OFFSET_Y = 200
/** 松手速度（px/s）超过此值进入甩抛弹跳模式。 */
const FLING_SPEED = 800
/** 边缘吸附时距屏幕边缘的留白（px）。 */
const EDGE_GAP = 8

export interface DeskConfig {
  soundMode: SoundMode
  showBubble: boolean
  showInfo: boolean
}

interface Props {
  onContextMenu?: (e: React.MouseEvent) => void
  config: DeskConfig
}

export interface WhaleWidgetHandle {
  resetPosition: () => void
}

export const WhaleWidget = forwardRef<WhaleWidgetHandle, Props>(
  function WhaleWidget({ onContextMenu, config }, ref) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 屏幕工作区尺寸
  const [screen, setScreen] = useState<{ w: number; h: number }>({ w: 1920, h: 1080 })
  // 角色左上角屏幕坐标。窗口实际位置 = 角色坐标 - ROLE_OFFSET。
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [flinging, setFlinging] = useState(false)
  const [bounce, setBounce] = useState(false)
  const [bounceAxis, setBounceAxis] = useState<'x' | 'y' | null>(null)
  const [petted, setPetted] = useState(false)
  const [petKey, setPetKey] = useState(0)
  const [bubble, setBubble] = useState<string | null>(null)
  const [bubbleKey, setBubbleKey] = useState(0)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const pressStartRef = useRef<{ x: number; y: number } | null>(null)
  const trackerRef = useRef(new FlingTracker())
  const flingRef = useRef<{ cancel: () => void } | null>(null)
  const bounceTimerRef = useRef(0)
  const petTimerRef = useRef(0)
  const posRef = useRef(pos)
  const eggRef = useRef(new EasterEgg())
  const soundRef = useRef<SoundEngine | null>(null)
  // 角色在窗口内的水平偏移（吸附左/右时贴边，否则居中）
  const [roleOffX, setRoleOffX] = useState(ROLE_OFFSET_X)
  const roleOffXRef = useRef(ROLE_OFFSET_X)
  if (soundRef.current === null) soundRef.current = new SoundEngine()

  // 应用音效模式
  useEffect(() => {
    soundRef.current?.setMode(config.soundMode)
  }, [config.soundMode])

  // 暴露重置位置：回到屏幕右下角
  useImperativeHandle(
    ref,
    () => ({
      resetPosition: () => {
        const { w, h } = screen
        const p = { x: Math.max(0, w - WIDGET_W - EDGE_GAP), y: Math.max(0, h - WIDGET_H - EDGE_GAP) }
        posRef.current = p
        setPos(p)
        setRoleOffX(ROLE_OFFSET_X)
        roleOffXRef.current = ROLE_OFFSET_X
        moveWindow(p.x - ROLE_OFFSET_X, p.y - ROLE_OFFSET_Y)
      }
    }),
    [screen]
  )

  /** 把角色屏幕坐标换算成窗口左上角坐标并节流移动窗口。 */
  const moveRoleTo = useCallback((x: number, y: number) => {
    moveWindow(x - roleOffXRef.current, y - ROLE_OFFSET_Y)
  }, [])

  // 获取屏幕尺寸并初始化位置（右下角）
  useEffect(() => {
    let alive = true
    const init = async () => {
      let w = window.innerWidth
      let h = window.innerHeight
      if (isTauri()) {
        const s = await getScreenSize()
        if (s) {
          w = s.w
          h = s.h
        }
      }
      if (!alive) return
      setScreen({ w, h })
      const p = { x: Math.max(0, w - WIDGET_W - EDGE_GAP), y: Math.max(0, h - WIDGET_H - EDGE_GAP) }
      posRef.current = p
      setPos(p)
      setReady(true)
      moveRoleTo(p.x, p.y)
    }
    void init()
    return () => {
      alive = false
    }
  }, [moveRoleTo])

  // 位置引用，供回调读取最新值
  useEffect(() => {
    posRef.current = pos
  }, [pos])

  // 清理计时与弹跳循环
  useEffect(() => {
    return () => {
      window.clearTimeout(bounceTimerRef.current)
      window.clearTimeout(petTimerRef.current)
      flingRef.current?.cancel()
    }
  }, [])

  const stopFling = useCallback(() => {
    if (flingRef.current) {
      flingRef.current.cancel()
      flingRef.current = null
    }
    setFlinging(false)
  }, [])

  const shake = useCallback(() => {
    setBounce(true)
    window.clearTimeout(bounceTimerRef.current)
    bounceTimerRef.current = window.setTimeout(() => setBounce(false), 300)
  }, [])

  /** 平滑移动到目标（rAF 过渡，300ms 缓出）。 */
  const animateTo = useCallback(
    (tx: number, ty: number, onDone?: () => void) => {
      const from = posRef.current
      const dist = Math.hypot(tx - from.x, ty - from.y)
      if (dist < 1) {
        onDone?.()
        return
      }
      const dur = 300
      const t0 = performance.now()
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur)
        const k = ease(t)
        const nx = from.x + (tx - from.x) * k
        const ny = from.y + (ty - from.y) * k
        posRef.current = { x: nx, y: ny }
        setPos({ x: nx, y: ny })
        moveRoleTo(nx, ny)
        if (t < 1) {
          requestAnimationFrame(step)
        } else {
          posRef.current = { x: tx, y: ty }
          setPos({ x: tx, y: ty })
          moveRoleTo(tx, ty)
          onDone?.()
        }
      }
      requestAnimationFrame(step)
    },
    [moveRoleTo]
  )

  /** 吸附到屏幕边缘：角色靠近某边缘时，让窗口贴到该边缘（窗口保持完整在屏幕内，气泡随之不超屏）。返回是否吸附。 */
  const snap = useCallback(
    (x: number, y: number): boolean => {
      const { w, h } = screen
      // 角色四边到屏幕边缘的距离
      const distLeft = x
      const distRight = w - (x + WIDGET_W)
      const distTop = y
      const distBottom = h - (y + WIDGET_H)
      const minDist = Math.min(distLeft, distRight, distTop, distBottom)
      // 吸附阈值：角色边缘距屏幕边缘超过阈值则悬停
      const THRESHOLD = 140
      if (minDist > THRESHOLD) return false

      // 窗口完整在屏幕内可活动的范围
      const maxX = Math.max(0, w - WIN_W)
      const maxY = Math.max(0, h - WIN_H)

      // 吸附左/右：角色在窗口内也贴边，使角色屏幕坐标贴屏幕边缘
      let targetWinLeft = Math.max(0, Math.min(maxX, x - roleOffXRef.current))
      let targetWinTop = Math.max(0, Math.min(maxY, y - ROLE_OFFSET_Y))
      let targetOffX = roleOffXRef.current

      if (minDist === distLeft) {
        targetWinLeft = 0
        targetOffX = EDGE_GAP
      } else if (minDist === distRight) {
        targetWinLeft = maxX
        targetOffX = WIN_W - WIDGET_W - EDGE_GAP
      } else if (minDist === distTop) {
        targetWinTop = 0
      } else if (minDist === distBottom) {
        targetWinTop = maxY
      }

      // 应用角色窗口内水平偏移
      setRoleOffX(targetOffX)
      roleOffXRef.current = targetOffX

      // 角色屏幕坐标 = 窗口位置 + 角色窗口内偏移
      animateTo(targetWinLeft + targetOffX, targetWinTop + ROLE_OFFSET_Y)
      return true
    },
    [screen, animateTo]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      stopFling()
      // 用屏幕坐标（screenX/screenY）而非窗口内坐标，避免透明小窗口坐标换算错位
      dragRef.current = {
        dx: e.screenX - posRef.current.x,
        dy: e.screenY - posRef.current.y
      }
      pressStartRef.current = { x: e.screenX, y: e.screenY }
      trackerRef.current.clear()
      setPressed(true)
      setDragging(true)
      soundRef.current?.unlock()
      soundRef.current?.press()
      try {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    },
    [stopFling]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      trackerRef.current.push(e.screenX, e.screenY)
      const { w, h } = screen
      // 角色屏幕坐标 = 鼠标屏幕坐标 - 按下时的偏移（角色跟随鼠标）
      const nx = e.screenX - dragRef.current.dx
      const ny = e.screenY - dragRef.current.dy
      const cx = Math.max(0, Math.min(w - WIDGET_W, nx))
      const cy = Math.max(0, Math.min(h - WIDGET_H, ny))
      posRef.current = { x: cx, y: cy }
      setPos({ x: cx, y: cy })
      moveRoleTo(cx, cy)
    },
    [screen, moveRoleTo]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStartRef.current
      const moved = start !== null && Math.hypot(e.screenX - start.x, e.screenY - start.y) > 6
      const vel = trackerRef.current.velocity()
      trackerRef.current.clear()
      dragRef.current = null
      pressStartRef.current = null
      setPressed(false)
      setDragging(false)
      soundRef.current?.release()

      // 点击（非拖拽）：触发彩蛋/随机台词
      if (!moved) {
        setPetted(true)
        setPetKey((k) => k + 1)
        window.clearTimeout(petTimerRef.current)
        // 抚摸动作约 0.5s，播完一次即移除（gif 循环但只显示一次抚摸窗口）
        petTimerRef.current = window.setTimeout(() => setPetted(false), 500)
        const r = eggRef.current.onPress()
        setBubble(r.kind === 'quote' ? r.text : pickRandomIdleLine())
        setBubbleKey((k) => k + 1)
      } else if (vel && Math.hypot(vel.vx, vel.vy) >= FLING_SPEED) {
        // 快速甩抛：进入弹跳模式（基于屏幕边界）
        setFlinging(true)
        const p = posRef.current
        let bounced = false
        flingRef.current = startFling({
          x: p.x,
          y: p.y,
          vx: vel.vx,
          vy: vel.vy,
          width: WIDGET_W,
          height: WIDGET_H,
          screenW: screen.w,
          screenH: screen.h,
          onMove: (x, y) => {
            posRef.current = { x, y }
            setPos({ x, y })
            moveRoleTo(x, y)
          },
          onBounce: (axis) => {
            bounced = true
            soundRef.current?.bounce()
            shake()
            setBounceAxis(axis)
            window.clearTimeout(bounceTimerRef.current)
            bounceTimerRef.current = window.setTimeout(() => setBounceAxis(null), 260)
          },
          onDone: (x, y) => {
            flingRef.current = null
            setFlinging(false)
            if (!bounced) soundRef.current?.bounce()
            snap(x, y)
          }
        })
      } else {
        // 慢速拖拽：靠近边缘则吸附（平滑过渡 + 碰撞音），否则悬停
        if (snap(posRef.current.x, posRef.current.y)) {
          soundRef.current?.bounce()
        }
      }

      try {
        ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      } catch {
        // ignore
      }
    },
    [shake, snap, screen, moveRoleTo, config.showBubble]
  )

  // 右键菜单：由外层 App 处理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onContextMenu?.(e)
    },
    [onContextMenu]
  )

  const flip = pos.x + WIDGET_W / 2 < screen.w / 2
  // 角色靠近屏幕顶部时气泡显示在角色下方，避免超出屏幕顶部；否则在角色上方
  const bubbleUp = pos.y > 200

  // 窗口内布局：角色置于窗口中下部，上下留气泡空间
  return (
    <>
      <style>{WIDGET_CSS}</style>
      <div
        className="wg-desk"
        style={{
          width: WIN_W,
          height: WIN_H,
          position: 'absolute',
          left: 0,
          top: 0
        }}
      >
        <div
          ref={rootRef}
          className={`wg-root${dragging ? ' wg-dragging' : ''}${flinging ? ' wg-flinging' : ''}${bounce ? ' wg-bounce' : ''}${bounceAxis === 'x' ? ' wg-squash-x' : ''}${bounceAxis === 'y' ? ' wg-squash-y' : ''}${petted ? ' wg-pet' : ''}${flip ? ' wg-flip' : ''}`}
          style={{
            left: roleOffX,
            top: ROLE_OFFSET_Y,
            transform: pressed ? 'scaleY(0.9)' : undefined
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onContextMenu={handleContextMenu}
          data-pressed={pressed}
        >
          <img className="wg-img" src={WHALE_GIRL_DATA_URL} alt="鲸鱼娘" draggable={false} />
          {petted && (
            <div className="wg-rua" key={petKey}>
              <img src={RUA_GIF_URL} alt="" draggable={false} />
            </div>
          )}
        </div>
        {/* 信息面板：跟随角色，显示在角色下方 */
        config.showInfo && (
          <div
            className="wg-info-wrap"
            style={{ left: roleOffX + WIDGET_W / 2 }}
          >
            <InfoPanel />
          </div>
        )}
        {/* 气泡用窗口坐标定位（.wg-desk 直接子元素），水平跟随角色 */
        config.showBubble && bubble && (
          <div
            className={bubbleUp ? 'wg-bubble-wrap' : 'wg-bubble-wrap wg-bubble-below'}
            style={{ left: roleOffX + WIDGET_W / 2 }}
          >
            <Bubble key={bubbleKey} text={bubble} onClose={() => setBubble(null)} flip={flip} />
          </div>
        )}
      </div>
    </>
  )
  }
)
