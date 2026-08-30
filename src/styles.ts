// 挂件样式（内联注入，避免 tsdown CSS 提取后无人加载）
export const WIDGET_CSS = `
.wg-root {
  position: fixed;
  width: 170px;
  height: 170px;
  z-index: 9999;
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: transform 120ms ease, left 200ms ease, top 200ms ease;
}
.wg-flinging {
  transition: none;
}
.wg-dragging {
  transition: none;
}
.wg-squash-x .wg-img {
  animation: wg-squash-x 240ms ease-out;
}
.wg-squash-y .wg-img {
  animation: wg-squash-y 240ms ease-out;
}
@keyframes wg-squash-x {
  0% { transform: scaleX(1.35) scaleY(0.7); }
  60% { transform: scaleX(0.6) scaleY(1.35); }
  100% { transform: scaleX(1) scaleY(1); }
}
@keyframes wg-squash-y {
  0% { transform: scaleX(0.7) scaleY(1.35); }
  60% { transform: scaleX(1.35) scaleY(0.6); }
  100% { transform: scaleX(1) scaleY(1); }
}
.wg-root:active { cursor: grabbing; }
.wg-img {
  width: 100%;
  height: 76%;
  object-fit: contain;
  pointer-events: none;
  animation: wg-float 3.4s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(30, 50, 120, 0.18));
}
/* 省电模式：空闲时暂停角色漂浮动画，降低逐帧渲染开销 */
.wg-eco .wg-img {
  animation: none;
}
/* 角色吸附窗口左部时镜像翻转（面向右，贴合成窗沿），带平滑的 3D 翻转动画 */
.wg-flip {
  --wg-flip: -1;
}
.wg-flip .wg-img {
  transform: scaleX(-1);
  transition: transform 320ms ease;
}
/* 挂件翻转时，抚摸的手也镜像，从正确方向抚摸 */
.wg-flip .wg-rua img {
  transform: scaleX(-1);
}
@keyframes wg-float {
  0%, 100% { transform: translateY(0) scaleX(var(--wg-flip, 1)); }
  50% { transform: translateY(-9px) scaleX(var(--wg-flip, 1)); }
}
.wg-context {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(80, 110, 190, 0.25);
  border-radius: 8px;
  padding: 3px 6px;
  backdrop-filter: blur(4px);
}
.wg-context-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 2px;
}
.wg-context-pct {
  font-size: 12px;
  font-weight: 700;
  color: #1f2c4d;
}
.wg-context-bal {
  font-size: 11px;
  font-weight: 700;
  color: #2f7d4f;
  background: rgba(47, 125, 79, 0.1);
  border-radius: 999px;
  padding: 1px 7px;
}
.wg-context-bal-low {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}
.wg-context-track {
  height: 6px;
  background: rgba(80, 110, 190, 0.15);
  border-radius: 3px;
  overflow: hidden;
}
.wg-context-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 400ms ease, background 400ms ease;
}
.wg-context-detail {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(80, 110, 190, 0.25);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.55;
  color: #2a3a66;
  box-shadow: 0 6px 18px rgba(30, 50, 120, 0.18);
  z-index: 10001;
}
.wg-context-row {
  white-space: nowrap;
}
.wg-context-row strong {
  color: #1f2c4d;
}
.wg-badge {
  display: inline-block;
  margin-top: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}
.wg-badge-high {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.3);
}
.wg-badge-low {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.3);
}
.wg-warn {
  color: #dc2626;
  font-weight: 600;
  margin-top: 5px;
}
.wg-bubble {
  position: absolute;
  right: -4px;
  bottom: 100%;
  width: max-content;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.97);
  border: 1.5px solid rgba(74, 108, 247, 0.38);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 15px;
  line-height: 1.6;
  color: #1f2c4d;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(30, 50, 120, 0.22);
  z-index: 10000;
  animation: wg-pop 180ms ease-out;
  pointer-events: auto;
}
.wg-bubble-flip {
  right: auto;
  left: -4px;
}
.wg-bubble::after {
  content: '';
  position: absolute;
  right: 14px;
  bottom: -7px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(74, 108, 247, 0.38);
}
.wg-bubble-flip::after {
  right: auto;
  left: 14px;
}
@keyframes wg-pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.wg-rua {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 70px);
  transform: translateX(-50%);
  width: 88px;
  height: 88px;
  z-index: 10000;
  pointer-events: none;
}
.wg-rua img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
/* 抚摸时角色明显上下压缩一次（立即，无漂浮抖动） */
.wg-pet .wg-img {
  animation: wg-pet-stretch 0.1s ease-in-out 1;
}
@keyframes wg-pet-stretch {
  0%, 100% { transform: scaleX(var(--wg-flip, 1)) scaleY(1); }
  50% { transform: scaleX(var(--wg-flip, 1)) scaleY(0.85); }
}
@keyframes wg-rua-pat {
  0% { transform: translateX(-50%) translateY(0); }
  30% { transform: translateX(-50%) translateY(10px); }
  60% { transform: translateX(-50%) translateY(-4px); }
  100% { transform: translateX(-50%) translateY(0); }
}

.wg-menu {
  position: fixed;
  min-width: 190px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(80, 110, 190, 0.28);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 28px rgba(30, 50, 120, 0.22);
  z-index: 10010;
  font-size: 13px;
  color: #2a3a66;
  user-select: none;
  backdrop-filter: blur(6px);
}
.wg-menu-title {
  font-size: 11px;
  font-weight: 700;
  color: #7c8ab5;
  letter-spacing: 0.4px;
  padding: 4px 8px 2px;
}
.wg-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.wg-menu-item:hover {
  background: rgba(80, 110, 190, 0.1);
}
.wg-menu-radio {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #aab4d0;
  flex: none;
}
.wg-menu-radio.on {
  border-color: #4a6cf7;
  background: #4a6cf7;
  box-shadow: inset 0 0 0 2px #fff;
}
.wg-menu-check {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  border: 2px solid #aab4d0;
  position: relative;
  flex: none;
}
.wg-menu-check.on {
  background: #4a6cf7;
  border-color: #4a6cf7;
}
.wg-menu-check.on::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0;
  width: 3px;
  height: 7px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.wg-menu-divider {
  height: 1px;
  background: rgba(80, 110, 190, 0.15);
  margin: 4px 6px;
}
.wg-app {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: transparent;
}
.wg-desk-menu {
  position: fixed;
}
/* ---- 桌宠窗口布局覆盖 ---- */
.wg-desk {
  pointer-events: none;
}
.wg-desk .wg-root {
  position: absolute;
  width: 170px;
  height: 180px;
  pointer-events: auto;
  transition: transform 120ms ease;
}
/* 信息面板 wrapper：跟随角色，紧贴角色视觉底部 */
.wg-desk .wg-info-wrap {
  position: absolute;
  top: 342px;
  transform: translateX(-50%);
  width: 170px;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.wg-info {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(74, 108, 247, 0.28);
  border-radius: 10px;
  padding: 8px 10px;
  width: 150px;
  color: #1f2c4d;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 4px 16px rgba(30, 50, 120, 0.15);
  text-align: left;
}
.wg-info-time {
  font-size: 18px;
  font-weight: 700;
  color: #2a3a66;
  text-align: center;
}
.wg-info-date {
  font-size: 12px;
  color: #7c8ab5;
  text-align: center;
  margin-bottom: 6px;
}
.wg-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}
.wg-info-label {
  width: 26px;
  color: #5a6a99;
  font-weight: 600;
  flex: none;
}
.wg-info-bar {
  flex: 1;
  height: 6px;
  background: rgba(80, 110, 190, 0.15);
  border-radius: 3px;
  overflow: hidden;
}
.wg-info-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a6cf7, #7aa2ff);
  border-radius: 3px;
  transition: width 400ms ease;
}
.wg-info-val {
  font-size: 11px;
  color: #2a3a66;
  font-weight: 600;
  white-space: nowrap;
}
.wg-desk .wg-bubble-wrap {
  position: absolute;
  left: 50%;
  bottom: 370px;
  transform: translateX(-50%);
  width: 170px;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
/* 角色贴顶时气泡显示在角色下方 */
.wg-desk .wg-bubble-wrap.wg-bubble-below {
  bottom: auto;
  top: 390px;
}
.wg-desk .wg-bubble-wrap .wg-bubble {
  position: relative;
  left: auto;
  right: auto;
  top: auto;
  bottom: auto;
  transform: none;
  width: auto;
  max-width: 100%;
  line-height: 1.5;
  overflow-wrap: break-word;
  word-break: break-word;
  pointer-events: auto;
  box-sizing: border-box;
  /* 自定义动画：避免 wg-pop 的 scale 覆盖 translateX 导致瞬间错位 */
  animation: wg-pop-desk2 180ms ease-out;
}
.wg-desk .wg-bubble-wrap .wg-bubble.wg-bubble-flip {
  left: auto;
  right: auto;
}
/* 气泡尾巴朝下（指向角色） */
.wg-desk .wg-bubble-wrap .wg-bubble::after {
  right: auto;
  left: 50%;
  bottom: -7px;
  top: auto;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(74, 108, 247, 0.38);
}
/* 角色贴顶时气泡在角色下方，尾巴朝上 */
.wg-desk .wg-bubble-wrap.wg-bubble-below .wg-bubble::after {
  bottom: auto;
  top: -7px;
  border-top: none;
  border-bottom: 8px solid rgba(74, 108, 247, 0.38);
}
@keyframes wg-pop-desk2 {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
/* 抚摸手 gif：整体一次"出现-下压-收回-消失"，gif 在短暂窗口内播一次 */
.wg-desk .wg-rua {
  animation: wg-pet-hand 0.5s ease-in-out forwards;
}
@keyframes wg-pet-hand {
  0% { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  20% { opacity: 1; }
  50% { transform: translateX(-50%) translateY(8px); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
}
`
