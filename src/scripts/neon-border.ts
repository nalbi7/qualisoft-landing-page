// 네온 테두리 — 다크 화면에서 홈 솔루션 판(#pnl) · 솔루션 상세 왼쪽 판(.sp2__panel, D-039) 둘레를 빛 두 줄기가 마주 보며 천천히 도는 효과 (D-038).
// 사용자가 준 Originkit 「Neon Border」(React 컴포넌트)를 옮겼다 — 호 계산 · 빛 번짐 층 · 움직임 곡선 · 프리셋(두께 2 · 호 길이 70 · 번짐 75 · 속도 4, 계속 흐름)은 원본 그대로.
// 원본과 다른 곳:
//  - 색은 판의 지금 솔루션 색(홈 --pc · 상세 --c)을 따른다 — 홈에서 솔루션이 바뀌면 함께 바뀐다(Copilot 은 그라데이션 가운데 보라 #B69CFF)
//  - 모서리는 원본의 「rounded 40%」 대신 판의 실제 모서리 반지름 — 테두리가 판과 같은 크기 · 모양이 되게(사용자 지시)
//  - 판이 화면에 보이고 탭이 앞에 있을 때만 움직인다. 움직임 줄이기면 멈춘 한 장
// 켜고 끄는 것은 ambient-dark.ts — 다크로 바뀔 때 show(), 밝아질 때 hide(). 나타남 · 사라짐은 테마 전환과 함께(CSS, theme-dark.css .neon)

const P = { thickness: 2, borderSize: 70, glow: 75, speed: 4 }
const COP = '#B69CFF'

const EDGE_COPIES = 2
const GLOW_LAYERS = [
    { blur: 8, opacity: 0.5, reach: 0.3 },
    { blur: 15, opacity: 0.3, reach: 0.6 },
    { blur: 57, opacity: 0.18, reach: 1 },
]
const MAX_GLOW_BLUR = Math.max(...GLOW_LAYERS.map((l) => l.blur))
const MAX_GLOW_REACH = 36

function withAlpha(input: string, alpha: number) {
    const a = Math.max(0, Math.min(1, alpha))
    const s = input.trim()
    const hex = s.match(/^#([0-9a-f]{3,8})$/i)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
        const n = parseInt(h.slice(0, 6), 16)
        if (!Number.isFinite(n)) return `rgba(0,0,0,${a})`
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
    }
    const rgb = s.match(/^rgba?\(([^)]+)\)/i)
    if (rgb) {
        const parts = rgb[1].split(',').map((v) => parseFloat(v))
        if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`
    }
    return `rgba(0,0,0,${a})`
}

function perimeterPoint(u: number, w: number, h: number): [number, number] {
    const d = (((u % 1) + 1) % 1) * 2 * (w + h)
    if (d < w) return [d, 0]
    if (d < w + h) return [w, d - w]
    if (d < w * 2 + h) return [w - (d - w - h), h]
    return [0, h - (d - w * 2 - h)]
}

function cornerLap(k: number, w: number, h: number) {
    const p = 2 * (w + h)
    const at = [0, w / p, (w + h) / p, (w * 2 + h) / p]
    return Math.floor(k / 4) + at[((k % 4) + 4) % 4]
}

function perimeterAngle(u: number, w: number, h: number) {
    const [x, y] = perimeterPoint(u, w, h)
    return (Math.atan2(x - w / 2, h / 2 - y) * 180) / Math.PI
}

const ARC_SAMPLES = 24
const MIN_ARC = 0.015

function buildArc(lap: number, lengthPct: number, w: number, h: number, color: string) {
    const fw = w > 0 ? w : 100
    const fh = h > 0 ? h : 100
    const len = Math.max(0, Math.min(100, lengthPct))
    const span = Math.max(MIN_ARC, (len / 100) * 0.5)
    const solidT = len / 100
    const stops: string[] = []
    let base = 0
    let prev = 0
    let acc = 0
    for (let i = 0; i <= ARC_SAMPLES; i++) {
        const f = i / ARC_SAMPLES
        const angle = perimeterAngle(lap + (f - 0.5) * span, fw, fh)
        if (i === 0) base = angle
        else {
            let d = angle - prev
            while (d > 180) d -= 360
            while (d < -180) d += 360
            acc += d
        }
        prev = angle
        const t = Math.abs(f - 0.5) * 2
        const k = solidT >= 1 ? 1 : t <= solidT ? 1 : 1 - (t - solidT) / (1 - solidT)
        stops.push(`${withAlpha(color, k * k * (3 - 2 * k))} ${acc.toFixed(2)}deg`)
    }
    const end = acc.toFixed(2)
    stops.push(`${withAlpha(color, 0)} ${end}deg`)
    stops.push(`${withAlpha(color, 0)} 360deg`)
    return `conic-gradient(from ${base.toFixed(2)}deg at 50% 50%, ${stops.join(', ')})`
}

const SLOWEST_CYCLE = 30
const FASTEST_CYCLE = 4
const GLIDE_EASE = [0.65, 0, 0.35, 1]

function makeEaseFn(pts: number[]) {
    const [x1, y1, x2, y2] = pts
    if (x1 === y1 && x2 === y2) return (t: number) => t
    const bez = (a: number, b: number, t: number) => {
        const u = 1 - t
        return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
    }
    return (t: number) => {
        const x = Math.max(0, Math.min(1, t))
        let s = x
        for (let i = 0; i < 8; i++) {
            const cx = bez(x1, x2, s) - x
            const u = 1 - s
            const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2)
            if (Math.abs(dx) < 1e-6) break
            s -= cx / dx
            s = Math.max(0, Math.min(1, s))
        }
        return bez(y1, y2, s)
    }
}
const glideEase = makeEaseFn(GLIDE_EASE)

// 띠 모양 — 안쪽(content-box)을 파내 테두리만 남긴다
const BAND_MASK =
    '-webkit-mask-image:linear-gradient(#fff 0 0),linear-gradient(#fff 0 0);-webkit-mask-clip:content-box,border-box;-webkit-mask-composite:xor;' +
    'mask-image:linear-gradient(#fff 0 0),linear-gradient(#fff 0 0);mask-clip:content-box,border-box;mask-composite:exclude;'

const still = matchMedia('(prefers-reduced-motion: reduce)')
let panel: HTMLElement | null = null
let root: HTMLElement | null = null
let groups: HTMLElement[] = []
let w = 0
let h = 0
let radius = 0
let color = '#A99BFF'
let raf = 0
let on = false
let seen = true
let off = 0
let last = 0
let lap = 0
let corner = 0
let stepT = 0

// 원본 컴포넌트가 그리는 층을 그대로 만든다 — 묶음 둘(마주 보는 두 줄기) × (번짐 3겹 + 선 2겹)
function build() {
    if (!panel) return
    const r = panel.getBoundingClientRect()
    w = r.width
    h = r.height
    radius = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0
    const thick = Math.max(1, Math.min(10, P.thickness))
    const amount = Math.max(0, Math.min(100, P.glow)) / 100
    const ringAt = (share: number) => thick + amount * MAX_GLOW_REACH * share
    const glowOuter = 10 + MAX_GLOW_REACH + MAX_GLOW_BLUR * 2
    const rad = (x: number) => (radius > 0 ? radius + x : 0)
    const band = (rr: number, offset = 0) =>
        `<div style="position:absolute;inset:${offset - rr}px;box-sizing:border-box;padding:${rr}px;border-radius:${rad(rr)}px;background:var(--arc);${BAND_MASK}"></div>`
    const glowLayer = (rr: number, blur: number, opacity: number) =>
        `<div style="position:absolute;inset:${-glowOuter}px;box-sizing:border-box;padding:${glowOuter}px;border-radius:${rad(glowOuter)}px;opacity:${opacity};mix-blend-mode:plus-lighter;filter:blur(${blur}px);${BAND_MASK}">${band(rr, glowOuter)}</div>`
    const group = () =>
        `<div class="neon__g" style="position:absolute;inset:0;overflow:visible;pointer-events:none">` +
        (amount > 0 ? GLOW_LAYERS.map((l) => glowLayer(ringAt(l.reach), l.blur, l.opacity)).join('') : '') +
        Array.from({ length: EDGE_COPIES }, () => `<div style="position:absolute;inset:0;mix-blend-mode:plus-lighter">${band(thick)}</div>`).join('') +
        `</div>`
    root!.innerHTML = group() + group()
    groups = Array.from(root!.children) as HTMLElement[]
    paint()
}

function readColor() {
    if (!panel) return
    const cs = getComputedStyle(panel)
    const pc = (cs.getPropertyValue('--pc') || cs.getPropertyValue('--c')).trim()
    color = panel.matches('.pnl--cop, .sp2__panel--cop') || !pc.startsWith('#') ? COP : pc
}

function paint() {
    groups[0]?.style.setProperty('--arc', buildArc(lap, P.borderSize, w, h, color))
    groups[1]?.style.setProperty('--arc', buildArc(lap + 0.5, P.borderSize, w, h, color))
}

function frame(now: number) {
    raf = 0
    if (!on || !seen || document.hidden) return
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    const s = Math.max(0, Math.min(20, P.speed))
    if (s > 0) {
        const beat = (SLOWEST_CYCLE + ((FASTEST_CYCLE - SLOWEST_CYCLE) * (s - 1)) / 19) / 4
        stepT += dt / beat
        while (stepT >= 1) {
            stepT -= 1
            corner += 1
        }
        const fw = w > 0 ? w : 100
        const fh = h > 0 ? h : 100
        const from = cornerLap(corner, fw, fh)
        const to = cornerLap(corner + 1, fw, fh)
        lap = from + (to - from) * glideEase(stepT)
        paint()
    }
    raf = requestAnimationFrame(frame)
}

function run() {
    if (raf || !on || !seen || document.hidden || still.matches) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
}

function ensure(): boolean {
    if (root) return true
    panel = document.querySelector<HTMLElement>('#pnl, .sp2__panel')
    if (!panel) return false
    root = document.createElement('div')
    root.className = 'neon'
    root.setAttribute('aria-hidden', 'true')
    panel.append(root)
    readColor()
    build()
    // 솔루션이 바뀌면 색을, 판 크기 · 모서리가 바뀌면 층을 다시
    new MutationObserver(() => { readColor(); paint() }).observe(panel, { attributes: true, attributeFilter: ['style', 'class'] })
    new ResizeObserver(() => {
        const r = panel!.getBoundingClientRect()
        const rr = parseFloat(getComputedStyle(panel!).borderTopLeftRadius) || 0
        if (r.width !== w || r.height !== h || rr !== radius) build()
    }).observe(panel)
    new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; run() }).observe(panel)
    document.addEventListener('visibilitychange', run)
    return true
}

export function show() {
    clearTimeout(off)
    if (!ensure()) return
    on = true
    readColor()
    paint()
    run()
}

export function hide(dur = 600) {
    clearTimeout(off)
    off = window.setTimeout(() => {
        on = false
        if (raf) cancelAnimationFrame(raf)
        raf = 0
    }, dur + 50)
}
