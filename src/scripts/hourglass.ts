// 모래시계 빛 — 다크 화면 맨 뒤에서 빛줄기 다발이 허리처럼 조였다가 위아래로 퍼지며 천천히 흐르는 효과 (D-037).
// 사용자가 준 Originkit 「Glowing Hourglass Shaped」(LumenCinch, React · WebGL2 컴포넌트)를 사이트용으로 옮겼다.
// 셰이더 · 흐름 지도 · 빛 봉투(ENV_B64) · 계산은 원본 그대로, 프리셋도 붙여 준 값 그대로(원본 색 — 사용자 선택).
// 원본과 다른 곳:
//  - React 없이 화면에 고정한 캔버스 하나(z-index -1). 크기는 창을 따른다(원본은 담는 상자)
//  - 바탕을 칠하지 않는다(땅 색 투명) — 페이지 바탕 #0A0A0A 가 비치고, CSS 불투명도로 서서히 드러난다
//  - 마우스를 빛에 올리면 빨라지는 동작은 뺐다 — 글 뒤에 깔려 포인터가 닿지 않고, 자동 다크는 움직이면 밝게 돌아간다
// 이 파일은 다크로 바뀔 때만 따로 불러온다(ambient-dark.ts 의 import()). 켜고 끄는 것도 거기서 — show() · hide()

// ── Reference frame ─────────────────────────────────────────────────────────
const REF_W = 1200
const REF_H = 800
const REF_ASPECT = REF_W / REF_H
/** The poster is 2:3; world units are poster heights, so it is this wide. */
const PW = 832 / 1248

/**
 * Flow map from the poster: x (share of poster width) = Σ c[i][j] · u^i · (y − ½)^j,
 * stored per power of y as (c0j, c1j, c2j, c3j).
 */
const FLOW_COEF = new Float32Array([
    0.30816, 0.40006, -0.05315, 0.03825,
    0.46095, 0.74368, -0.95943, 0.25752,
    -2.32926, 7.13898, -5.7034, 3.24016,
    0.39316, 3.8443, 0.64143, -5.62281,
    0.57072, -10.80117, 19.14651, -10.95897,
    -0.16449, -15.01109, 8.49324, 12.85689,
    6.02743, -4.75034, 5.28248, -2.22032,
])
const WAIST0 = 0.5
const PINCH_SIGMA = 0.3

/** The poster's large-scale light energy in lane space, sqrt(E / ENV_MAX) bytes. */
const ENV_U = 65
const ENV_Y = 97
const ENV_U0 = -0.3
const ENV_U1 = 1.3
const ENV_MAX = 2.6
const ENV_B64 =
    "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"

/** Lane-space fibre texture: u −0.15…1.15 across, one 2-poster-height period down. */
const FIB_W = 2048
const FIB_H = 256
const FIB_U0 = -0.15
const FIB_U1 = 1.15
const FIB_PERIOD = 2
const FIBRES_PER_LANE = 2.4
const BED_PER_LANE = 4
const RANGE_Y0 = -0.75
const RANGE_LEN = 2.5
const DUST_PER_UNIT = 30000
const GLINT_SEG = 10
const TILT_PERSPECTIVE = 1.5
/** Device-pixel budget for the canvas (원본 값). */
const MAX_PIXELS = 2.6e6
const QUALITY_LEVELS = [1, 0.85, 0.72, 0.6]
const FLOW_RATE = 1
const SMOOTH_FLOW_PX = 45

// ── 설정 — 원본 기본값에 사용자가 준 프리셋을 얹은 값 (원본 색 그대로) ──────────────
const P = {
    background: "rgba(0,0,0,0)", // 원본 #131212 — 사이트는 페이지 바탕이 비치게 비운다
    baseColor: "#FF6800",
    accentColor: "#FF0000",
    speed: 20,
    scale: 161,
    density: 120,
    pinch: 60,
    fringe: 100,
    placement: { x: 23.5, y: -14.5, tilt: -1, angle: -24 },
}
const ADV = {
    seed: 22,
    lanes: 41,
    occupancy: 54,
    waistY: 50,
    lean: 100,
    streakLength: 27,
    streakWidth: 1,
    defocus: 100,
    coreColor: "#D8CCC3",
    violetColor: "#8A6CFF",
    midColor: "#8D6A61",
    hazeColor: "#6F5449",
    dustColor: "#D8D0C8",
    cyanShare: 58,
    violetShare: 85,
    exposure: 140,
    bloom: 65,
    haze: 4,
    fibres: 175,
    dust: 88,
    stars: 50,
    grain: 12,
    vignette: 10,
    flowSpeed: 40,
    flicker: 30,
    breathe: 6,
    breathePeriod: 6000,
    twist: 2,
}

// ── Small helpers ───────────────────────────────────────────────────────────
type RGB = [number, number, number]

function parseColorA(s: string, fallback: RGB): { c: RGB; a: number } {
    s = s.trim()
    if (s[0] === "#") {
        const h = s.slice(1)
        const x = (t: string) => parseInt(t, 16) / 255
        if (h.length === 6 || h.length === 8) {
            const c: RGB = [x(h.slice(0, 2)), x(h.slice(2, 4)), x(h.slice(4, 6))]
            const a = h.length === 8 ? x(h.slice(6, 8)) : 1
            if (c.every(Number.isFinite) && Number.isFinite(a)) return { c, a }
        }
        return { c: fallback, a: 1 }
    }
    const m = /^rgba?\(([^)]*)\)$/i.exec(s)
    if (!m) return { c: fallback, a: 1 }
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
    if (parts.length < 3 || !parts.every(Number.isFinite)) return { c: fallback, a: 1 }
    const cl = (v: number) => Math.min(1, Math.max(0, v))
    return { c: [cl(parts[0] / 255), cl(parts[1] / 255), cl(parts[2] / 255)], a: cl(parts[3] ?? 1) }
}
const parseColor = (s: string, fallback: RGB): RGB => parseColorA(s, fallback).c

/** A colour as light: run backwards through the composite's soft clip. */
function asLight(c: RGB): RGB {
    const f = (v: number) => -Math.log(1 - Math.min(v, 0.96) * 0.97)
    return [f(c[0]), f(c[1]), f(c[2])]
}

function mulberry32(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function envData(): Uint8Array {
    const s = atob(ENV_B64)
    const out = new Uint8Array(ENV_U * ENV_Y)
    for (let i = 0; i < out.length && i < s.length; i++) out[i] = s.charCodeAt(i)
    return out
}

/**
 * Fibres in lane space: lines down the flow, each brightening and fading along
 * its length on whole cycles of the period so the texture wraps without a seam.
 */
function buildFibres(nBright: number, nBed: number, seed: number): { bright: Uint8Array; bed: Uint8Array } {
    const rnd = mulberry32(seed * 9973 + 17)
    const span = FIB_U1 - FIB_U0
    const lay = (acc: Float32Array, ch: number, stride: number, u: number, sig: number, amp: number, gate: number) => {
        const x = ((u - FIB_U0) / span) * FIB_W
        const k1 = 1 + Math.floor(rnd() * 3)
        const k2 = 4 + Math.floor(rnd() * 6)
        const k3 = 11 + Math.floor(rnd() * 14)
        const p1 = rnd()
        const p2 = rnd()
        const p3 = rnd()
        const x0 = Math.floor(x - 3 * sig)
        const x1 = Math.ceil(x + 3 * sig)
        const wts: number[] = []
        for (let xi = x0; xi <= x1; xi++) wts.push(Math.exp(-0.5 * ((xi + 0.5 - x) / sig) ** 2) / (sig * 2.5066))
        for (let row = 0; row < FIB_H; row++) {
            const s = row / FIB_H
            const n =
                0.5 * Math.sin(2 * Math.PI * (k1 * s + p1)) + 0.32 * Math.sin(2 * Math.PI * (k2 * s + p2)) + 0.18 * Math.sin(2 * Math.PI * (k3 * s + p3))
            const t = Math.min(1, Math.max(0, (n + gate) / 0.8))
            const a = amp * t * t * (3 - 2 * t)
            if (a <= 0.002) continue
            for (let xi = x0, k = 0; xi <= x1; xi++, k++) {
                if (xi < 0 || xi >= FIB_W) continue
                acc[(row * FIB_W + xi) * stride + ch] += a * wts[k]
            }
        }
    }
    const accB = new Float32Array(FIB_W * FIB_H * 4)
    for (let f = 0; f < nBright; f++) {
        const u = -0.05 + 1.1 * ((f + rnd()) / nBright)
        const r = rnd()
        const ch = r < 0.4 ? 0 : r < 0.62 ? 1 : r < 0.82 ? 2 : 3
        lay(accB, ch, 4, u, 0.8 + 0.7 * rnd(), 0.35 + 0.65 * rnd(), 0.02)
    }
    const accD = new Float32Array(FIB_W * FIB_H)
    for (let f = 0; f < nBed; f++) lay(accD, 0, 1, -0.06 + 1.12 * rnd(), 0.6 + 0.5 * rnd(), 0.2 + 0.6 * rnd(), 0.35)
    const enc = (acc: Float32Array) => {
        const out = new Uint8Array(acc.length)
        for (let i = 0; i < acc.length; i++) out[i] = Math.min(255, Math.round(Math.sqrt(Math.min(1, acc[i] * 1.6)) * 255))
        return out
    }
    return { bright: enc(accB), bed: enc(accD) }
}

// ── GLSL (원본 그대로) ───────────────────────────────────────────────────────
const HEAD = `#version 300 es
precision highp float;
precision highp int;
`

const FLOW_GLSL = `
uniform vec4 uFc[7];
uniform vec4 uShape;   // lean blend A, B; waist width ×; waist shift
uniform vec4 uMap;     // cos angle, sin angle, tilt (rad), perspective (CSS px)
uniform vec4 uMap2;    // CSS px per world unit, content centre x, y (CSS px), device px per CSS px
uniform vec2 uFrame;   // frame size, CSS px
uniform vec4 uDof;     // focus y, sharp half-band, blur gain (world), hairline sigma (CSS px)
uniform sampler2D uEnv;
const float PW = ${PW.toFixed(7)};
const float WAIST0 = ${WAIST0.toFixed(3)};
const float PINCH_SIGMA = ${PINCH_SIGMA.toFixed(3)};

uint hu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
vec4 h4(uint x) {
    uint a = hu(x); uint b = hu(a ^ 0x9e3779b9u); uint c = hu(b ^ 0x85ebca6bu); uint d = hu(c ^ 0xc2b2ae35u);
    return vec4(float(a >> 8u), float(b >> 8u), float(c >> 8u), float(d >> 8u)) * (1.0 / 16777216.0);
}

vec4 coefY(float y) {
    float yc = clamp(y, 0.0, 1.0);
    float t = yc - 0.5;
    vec4 a = uFc[6];
    vec4 da = vec4(0.0);
    for (int j = 5; j >= 0; j--) { da = da * t + a; a = a * t + uFc[j]; }
    float dy = y - yc;
    return a + da * (sign(dy) * 0.15 * (1.0 - exp(-abs(dy) / 0.15)));
}
vec2 cub(vec4 a, float u) {
    float uc = clamp(u, -0.25, 1.25);
    float d = a.y + uc * (2.0 * a.z + 3.0 * uc * a.w);
    float v = a.x + uc * (a.y + uc * (a.z + uc * a.w));
    return vec2(v + d * (u - uc), d);
}
struct Row { vec4 a; float c; float wy; };
Row rowAt(float y) {
    Row r;
    float yb = y - uShape.w;
    r.a = coefY(yb);
    r.c = (uShape.x - uShape.y) * cub(r.a, 0.5).x + uShape.y;
    float g = (yb - WAIST0) / PINCH_SIGMA;
    r.wy = 1.0 + (uShape.z - 1.0) * exp(-g * g);
    return r;
}
vec2 laneX(Row r, float u) {
    vec2 f = cub(r.a, u);
    vec2 g = cub(r.a, 1.0 - u);
    float x = uShape.x * f.x - uShape.y * g.x + uShape.y;
    float d = uShape.x * f.y + uShape.y * g.y;
    return vec2(r.c + (x - r.c) * r.wy, max(d * r.wy, 0.02));
}
vec2 worldAt(float u, float y) {
    return vec2(PW * laneX(rowAt(y), u).x, y);
}
float dofAt(float y) {
    float d = max(abs(y - uDof.x) - uDof.y, 0.0);
    return uDof.z * pow(d, 1.3);
}
float endsAt(float y) {
    return smoothstep(0.03, 0.2, max(abs(y - uDof.x) - uDof.y, 0.0));
}
vec2 toScreen(vec2 w) {
    vec2 q = (w - vec2(PW * 0.5, 0.5)) * uMap2.x;
    vec2 r = vec2(q.x * uMap.x - q.y * uMap.y, q.x * uMap.y + q.y * uMap.x);
    float k = uMap.w / max(uMap.w - r.y * sin(uMap.z), 1.0);
    return uMap2.yz + vec2(r.x, r.y * cos(uMap.z)) * k;
}
vec2 toWorld(vec2 s) {
    vec2 v = s - uMap2.yz;
    float st = sin(uMap.z);
    float ry = v.y * uMap.w / max(cos(uMap.z) * uMap.w + v.y * st, 1.0);
    float k = uMap.w / max(uMap.w - ry * st, 1.0);
    vec2 r = vec2(v.x / k, ry);
    vec2 q = vec2(r.x * uMap.x + r.y * uMap.y, -r.x * uMap.y + r.y * uMap.x);
    return q / uMap2.x + vec2(PW * 0.5, 0.5);
}
vec4 toClip(vec2 s) {
    return vec4(s.x / uFrame.x * 2.0 - 1.0, 1.0 - s.y / uFrame.y * 2.0, 0.0, 1.0);
}
float envRow(float u, float y) {
    vec2 tc = vec2(((u - ${ENV_U0.toFixed(2)}) / ${(ENV_U1 - ENV_U0).toFixed(2)} * ${(ENV_U - 1).toFixed(1)} + 0.5) / ${ENV_U.toFixed(1)},
                   (y * ${(ENV_Y - 1).toFixed(1)} + 0.5) / ${ENV_Y.toFixed(1)});
    return texture(uEnv, tc).r;
}
float envAt(float u, float y) {
    float yc = clamp(y, 0.0, 1.0);
    float e = envRow(u, yc);
    float d = abs(y - yc);
    if (d > 0.0) {
        float yi = yc < 0.5 ? 0.04 : 0.96;
        float slope = (e - envRow(u, yi)) / 0.04;
        e = max(e + slope * 0.08 * (1.0 - exp(-d / 0.08)), 0.0);
    }
    float edge = smoothstep(${ENV_U0.toFixed(2)}, ${(ENV_U0 + 0.1).toFixed(2)}, u) * (1.0 - smoothstep(${(ENV_U1 - 0.1).toFixed(2)}, ${ENV_U1.toFixed(2)}, u));
    return e * e * ${ENV_MAX.toFixed(2)} * edge / (1.0 + 1.5 * d * d / (d + 0.15));
}
`

const GLINT_VS =
    HEAD +
    FLOW_GLSL +
    `
uniform vec4 uGl;   // lanes, slots per lane, cell length, range start
uniform vec4 uGl2;  // range length, flow offset, occupancy, seed
uniform vec4 uGl3;  // hairline sigma (CSS px), gain, cyan share, violet share
uniform vec4 uGl4;  // flicker, time, fringe per defocus px, fringe base px
uniform vec3 uCoreE;
uniform vec3 uBaseE;
uniform vec3 uAccE;
uniform vec3 uVioE;
out vec4 vA;
out float vSc;
out vec3 vCore;
out vec3 vHalo;
out float vI;
const int SEG = ${GLINT_SEG};
void main() {
    int corner = gl_VertexID % 6;
    int seg = gl_VertexID / 6;
    int rowOff = (corner == 2 || corner == 4 || corner == 5) ? 1 : 0;
    float side = (corner == 1 || corner == 3 || corner == 5) ? 1.0 : -1.0;
    uint inst = uint(gl_InstanceID);
    uint NS = uint(uGl.y);
    uint lane = inst / NS;
    uint slot = inst - lane * NS;
    uint sd = uint(uGl2.w) * 0x9E3779B1u;
    vec4 hl = h4(lane * 0x27d4eb2du + sd);
    float u = mix(-0.08, 1.08, (float(lane) + 0.5 + (hl.x - 0.5) * 0.9) / uGl.x);
    float cell = uGl.z;
    float P = uGl2.x;
    float m = (float(slot) + hl.y) * cell - uGl2.y * (0.8 + 0.4 * hl.z);
    float cyc = floor(m / P);
    float mw = m - cyc * P;
    uint cu = uint(int(cyc) + 65536);
    vec4 hs = h4(inst * 0x165667b1u + cu * 0x61c88647u + sd);
    vec4 hs2 = h4(hu(inst ^ 0x5bd1e995u) + cu * 0x2545f491u + sd);
    float yc = uGl.w + mw;
    float flank = smoothstep(0.25, 0.5, abs(u - 0.5));
    float wq = hs.w * (1.0 - 0.75 * flank);
    float spread = laneX(rowAt(yc), u).y / 0.38;
    float len = cell * (0.12 + 0.5 * hs.y * hs.y) * (1.0 + 2.0 * wq * wq) * pow(max(spread, 0.5), 0.9);
    float env = envAt(u, yc);
    float fade = smoothstep(0.0, 0.25, mw) * smoothstep(0.0, 0.25, P - mw);
    if (hs.x > uGl2.z || env * fade < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

    float tau = float(seg + rowOff) / float(SEG);
    float y = yc + (tau - 0.5) * len;
    vec2 lx = laneX(rowAt(y), u);
    vec2 w0 = vec2(PW * lx.x, y);
    vec2 s0 = toScreen(w0);
    vec2 s1 = toScreen(worldAt(u, y + 0.004));
    vec2 t = s1 - s0;
    t = t / max(length(t), 1e-5);
    vec2 n = vec2(-t.y, t.x);
    float a = sin(3.14159265 * tau);
    a *= a;
    float dofPx = dofAt(y) * uMap2.x;
    float wU = 0.003 * pow(12.0, wq);
    float body = max(uGl3.x, wU * lx.y * PW * uMap2.x) * (0.35 + 0.65 * sqrt(a));
    float sig = sqrt(body * body + dofPx * dofPx);
    vSc = sqrt(uGl3.x * uGl3.x + dofPx * dofPx);
    float delta = (uGl4.w + uGl4.z * dofPx) * (u < 0.5 ? -1.0 : 1.0);
    float ext = 3.0 * sig + abs(delta) + 1.0;
    gl_Position = toClip(s0 + n * side * ext);
    vA = vec4(side * ext, tau, sig, delta);
    float fl = 1.0 - uGl4.x + uGl4.x * (0.5 + 0.5 * sin(6.2831853 * (uGl4.y * (0.15 + 0.5 * hs2.x) + hs2.y)));
    vI = uGl3.y * env * fade * fl * (0.25 + 0.75 * hs.z * hs.z) * (body / sig);
    float ends = endsAt(yc);
    float cool = 2.0 * ends;
    float hj = hs2.w - 0.5;
    vec3 halo = uBaseE * vec3(1.0, 1.0 + 0.9 * hj, 1.0 + 1.2 * hj);
    vec3 core = uCoreE;
    float slim = 1.0 - smoothstep(0.35, 0.6, wq);
    if (hs2.z < uGl3.z * cool * slim) { halo = uAccE; core = mix(uCoreE, uAccE, 0.7); }
    else if (hs2.z < (uGl3.z + uGl3.w) * cool * slim) { halo = uVioE; core = mix(uCoreE, uVioE, 0.7); }
    float clump = smoothstep(0.5, 0.85, wq);
    vCore = core * (uGl3.x / vSc) * 0.6;
    vHalo = mix(halo, core * 0.6, clump);
}
`

const GLINT_FS =
    HEAD +
    `
in vec4 vA;
in float vSc;
in vec3 vCore;
in vec3 vHalo;
in float vI;
uniform float uOut;
out vec4 o;
void main() {
    float a = sin(3.14159265 * vA.y);
    a *= a;
    float s = max(vA.z, 0.3);
    float sc = max(min(vSc, s), 0.3);
    vec3 d = vec3(vA.x - vA.w, vA.x, vA.x + vA.w);
    vec3 E = vI * a * (vCore * exp(-0.5 * d * d / (sc * sc)) * sqrt(a) + vHalo * exp(-0.5 * d * d / (s * s)));
    o = vec4(clamp(E, vec3(0.0), vec3(64.0)) * uOut, 0.0);
}
`

const DUST_VS =
    HEAD +
    FLOW_GLSL +
    `
uniform vec4 uDu;   // range length, flow offset, point size (device px), strength
uniform vec4 uDu2;  // seed, time, range start, spray share
uniform vec3 uDustE;
out vec3 vC;
void main() {
    uint id = uint(gl_VertexID);
    uint sd = uint(uDu2.x) * 0x297a2d39u;
    vec4 h = h4(id * 0x2c1b3c6du + sd);
    vec4 h2 = h4(hu(id ^ 0x51ed270bu) + sd);
    float u = mix(-0.03, 1.03, h.w);
    float spray = 0.0;
    if (h.x < uDu2.w) {
        float o = 0.13 * h2.y * h2.y;
        u = h2.x < 0.5 ? -0.02 - o : 1.02 + o;
        spray = h2.y;
    }
    float P = uDu.x;
    float m = h.y * P - uDu.y * (0.25 + 0.15 * h.z);
    float mw = m - floor(m / P) * P;
    float y = uDu2.z + mw;
    vec2 wd = worldAt(u, y);
    vec2 s = toScreen(wd);
    float tw = max(0.0, 0.55 + 0.45 * sin(6.2831853 * (uDu2.y * (0.3 + 1.4 * h2.z) + h2.w)));
    float fade = smoothstep(0.0, 0.2, mw) * smoothstep(0.0, 0.2, P - mw);
    float b = uDu.w * tw * fade * (0.25 + 0.75 * h.z) * (1.0 - 0.8 * spray);
    gl_PointSize = uDu.z * (0.8 + 0.7 * h2.x * h2.x);
    gl_Position = b < 0.003 ? vec4(2.0, 2.0, 2.0, 1.0) : toClip(s);
    vC = uDustE * b;
}
`

const DUST_FS =
    HEAD +
    `
in vec3 vC;
uniform float uOut;
out vec4 o;
void main() {
    vec2 r = gl_PointCoord - 0.5;
    o = vec4(vC * exp(-dot(r, r) * 5.0) * uOut, 0.0);
}
`

const QUAD_VS =
    HEAD +
    `
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const DOWN_FS =
    HEAD +
    `
uniform sampler2D uSrc;
uniform vec2 uSrcPx;   // 1 / source size
uniform vec2 uDstRes;
out vec4 o;
void main() {
    vec2 uv = gl_FragCoord.xy / uDstRes;
    vec2 d = uSrcPx;
    o = 0.25 * (texture(uSrc, uv + vec2(-d.x, -d.y)) + texture(uSrc, uv + vec2(d.x, -d.y)) +
                texture(uSrc, uv + vec2(-d.x, d.y)) + texture(uSrc, uv + d));
}
`

const BLUR_FS =
    HEAD +
    `
uniform sampler2D uSrc;
uniform vec2 uStep;    // one texel along the blur axis, in uv
uniform vec2 uDstRes;
out vec4 o;
void main() {
    vec2 uv = gl_FragCoord.xy / uDstRes;
    vec4 acc = texture(uSrc, uv) * 0.16;
    float w[5] = float[5](0.1478, 0.1078, 0.0688, 0.0384, 0.0187);
    for (int i = 0; i < 5; i++) {
        vec2 off = uStep * float(i + 1);
        acc += (texture(uSrc, uv + off) + texture(uSrc, uv - off)) * w[i];
    }
    o = acc / (0.16 + 2.0 * 0.3815);
}
`

const FIELD_FS =
    HEAD +
    FLOW_GLSL +
    `
uniform sampler2D uFib;
uniform sampler2D uBed;
uniform vec2 uBuf;
uniform vec4 uFibP;    // flow offset, bed gain, gain, fringe per defocus px
uniform vec3 uMidE;
uniform vec3 uK0;
uniform vec3 uK1;
uniform vec3 uK2;
uniform vec3 uK3;
uniform vec3 uK2s;
uniform vec3 uK3s;
uniform vec4 uHazeN;
uniform vec3 uCoreN;
uniform vec3 uBaseN;
uniform vec2 uField;   // light pulse, output scale
out vec4 o;
const float FIB_SPAN = ${(FIB_U1 - FIB_U0).toFixed(3)};
void main() {
    float pxc = uMap2.w;
    vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / pxc;
    vec2 w = toWorld(css);
    float y = w.y;
    Row r = rowAt(y);
    float xf = w.x / PW;
    float xl = laneX(r, ${(ENV_U0 - 0.02).toFixed(2)}).x;
    float xr = laneX(r, ${(ENV_U1 + 0.02).toFixed(2)}).x;
    if (xf < min(xl, xr) || xf > max(xl, xr)) { o = vec4(0.0); return; }
    float x0 = laneX(r, 0.0).x;
    float x1 = laneX(r, 1.0).x;
    float u = (xf - x0) / max(x1 - x0, 1e-3);
    vec2 f = laneX(r, u);
    u -= (f.x - xf) / f.y;
    f = laneX(r, u);
    u -= (f.x - xf) / f.y;
    f = laneX(r, u);

    float env = envAt(u, y) * uField.x;
    if (env < 1e-3) { o = vec4(0.0); return; }
    float envB = env * sqrt(env / 0.8);
    float devPerWorld = uMap2.x * pxc;
    float pxPerU = f.y * PW * devPerWorld;
    float dofPx = dofAt(y) * devPerWorld;
    float hairPx = uDof.w * pxc;
    float texPerPx = ${FIB_W.toFixed(1)} / FIB_SPAN / pxPerU;
    float lod = log2(max(1.0, max(texPerPx, 3.4 * sqrt(hairPx * hairPx + dofPx * dofPx) * texPerPx)));
    float cs = endsAt(y);
    vec2 tc = vec2((u - ${FIB_U0.toFixed(3)}) / FIB_SPAN, (y + uFibP.x) / ${FIB_PERIOD.toFixed(2)});
    float dU = uFibP.w * dofPx / pxPerU / FIB_SPAN * (u < 0.5 ? -1.0 : 1.0);
    vec4 fr = textureLod(uFib, tc - vec2(dU, 0.0), lod);
    vec4 fg = textureLod(uFib, tc, lod);
    vec4 fb = textureLod(uFib, tc + vec2(dU, 0.0), lod);
    fr *= fr; fg *= fg; fb *= fb;
    float bed = textureLod(uBed, tc, lod).r;
    float wh = smoothstep(0.5, 1.8, env) * mix(0.35, 1.0, cs);
    vec3 fib = vec3(fr.x, fg.x, fb.x) * uK0 + vec3(fr.y, fg.y, fb.y) * mix(uK1, uK0, wh)
             + vec3(fr.z, fg.z, fb.z) * mix(uK2s, uK2, cs) + vec3(fr.w, fg.w, fb.w) * mix(uK3s, uK3, cs);
    vec3 tint = mix(mix(vec3(1.0), uHazeN.rgb / max(uCoreN, vec3(0.05)), 0.7), vec3(1.0), wh);
    vec3 E = (fib * tint * uFibP.z * env / 0.8 + uMidE * (bed * bed * uFibP.y * (1.0 - 0.6 * cs))) * envB;
    vec3 haze = uHazeN.w * mix(mix(uHazeN.rgb, uBaseN, 0.1), uCoreN, wh * 0.7);
    E += haze * mix(env, envB, 0.5) * mix(1.0, 0.15, cs);
    if (any(isnan(E)) || any(isinf(E))) E = vec3(0.0);
    o = vec4(min(E, vec3(64.0)) * uField.y, 0.0);
}
`

const COMP_FS =
    HEAD +
    `
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform vec2 uBuf;
uniform vec4 uLook;    // exposure, bloom, scene scale, device px per CSS px
uniform vec4 uBg;      // ground (straight rgb), alpha
uniform vec4 uFx;      // grain, vignette, stars, time
uniform vec3 uDustE;
uniform float uSeed;
out vec4 o;
uint hu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
vec4 h4(uint x) {
    uint a = hu(x); uint b = hu(a ^ 0x9e3779b9u); uint c = hu(b ^ 0x85ebca6bu); uint d = hu(c ^ 0xc2b2ae35u);
    return vec4(float(a >> 8u), float(b >> 8u), float(c >> 8u), float(d >> 8u)) * (1.0 / 16777216.0);
}
void main() {
    float pxc = uLook.w;
    vec2 css = vec2(gl_FragCoord.x, uBuf.y - gl_FragCoord.y) / pxc;
    vec2 uv = gl_FragCoord.xy / uBuf;
    vec3 E = (texture(uScene, uv).rgb * (1.0 - uLook.y) + uLook.y * (0.5 * texture(uBloomA, uv).rgb + 0.5 * texture(uBloomB, uv).rgb)) * uLook.z;
    vec3 lit = 1.0 - exp(-E * uLook.x);

    vec2 cell = floor(css / 14.0);
    vec4 hs = h4(uint(int(cell.x) + 4096) * 0x8da6b343u + uint(int(cell.y) + 4096) * 0xd8163841u + uint(uSeed) * 0xcb1ab31fu);
    float star = 0.0;
    if (hs.x < uFx.z) {
        vec2 c = (cell + 0.15 + 0.7 * hs.yz) * 14.0;
        vec2 dd = (css - c) * pxc;
        float rad = 0.35 * pxc + 0.2;
        float tw = 0.8 + 0.2 * sin(uFx.w * (0.4 + hs.w) * 2.0 + hs.y * 40.0);
        star = (0.08 + 0.55 * hs.w * hs.w * hs.w) * tw * exp(-dot(dd, dd) / (2.0 * rad * rad));
    }
    lit = 1.0 - (1.0 - lit) * (1.0 - star * uDustE / max(max(uDustE.r, uDustE.g), max(uDustE.b, 1e-3)));

    float la = max(max(lit.r, lit.g), lit.b);
    vec3 rgb = lit + uBg.rgb * uBg.a * (1.0 - lit);
    float al = uBg.a + la * (1.0 - uBg.a);
    float vd = length(uv - 0.5) * 1.4142;
    rgb *= 1.0 - uFx.y * smoothstep(0.35, 1.0, vd);
    vec4 hg = h4(uint(gl_FragCoord.x) * 0x9e3779b1u + uint(gl_FragCoord.y) * 0x85ebca77u + uint(uFx.w * 24.0) * 0xc2b2ae3du);
    rgb += (hg.x - 0.5) * uFx.x * al;
    o = vec4(clamp(rgb, 0.0, al), al);
}
`

// ── GL plumbing ─────────────────────────────────────────────────────────────
function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
    const sh = (type: number, src: string) => {
        const s = gl.createShader(type)
        if (!s) throw new Error("createShader failed")
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
            const log = gl.getShaderInfoLog(s) || "shader compile failed"
            gl.deleteShader(s)
            throw new Error(log)
        }
        return s
    }
    const p = gl.createProgram()
    if (!p) throw new Error("createProgram failed")
    const v = sh(gl.VERTEX_SHADER, vs)
    const f = sh(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    gl.deleteShader(v)
    gl.deleteShader(f)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error(gl.getProgramInfoLog(p) || "link failed")
    }
    return p
}

/** Uniform setter that uploads only on change. */
class Uniforms {
    private loc = new Map<string, WebGLUniformLocation | null>()
    private last = new Map<string, Float64Array>()
    constructor(
        private gl: WebGL2RenderingContext,
        private prog: WebGLProgram
    ) {}
    private get(name: string) {
        let l = this.loc.get(name)
        if (l === undefined) {
            l = this.gl.getUniformLocation(this.prog, name)
            this.loc.set(name, l)
        }
        return l
    }
    private changed(name: string, a: number, b = 0, c = 0, d = 0) {
        let v = this.last.get(name)
        if (!v) {
            v = new Float64Array([NaN, NaN, NaN, NaN])
            this.last.set(name, v)
        }
        if (v[0] === a && v[1] === b && v[2] === c && v[3] === d) return false
        v[0] = a
        v[1] = b
        v[2] = c
        v[3] = d
        return true
    }
    f1(n: string, a: number) {
        if (this.changed(n, a)) this.gl.uniform1f(this.get(n), a)
    }
    f2(n: string, a: number, b: number) {
        if (this.changed(n, a, b)) this.gl.uniform2f(this.get(n), a, b)
    }
    f3(n: string, a: number, b: number, c: number) {
        if (this.changed(n, a, b, c)) this.gl.uniform3f(this.get(n), a, b, c)
    }
    f4(n: string, a: number, b: number, c: number, d: number) {
        if (this.changed(n, a, b, c, d)) this.gl.uniform4f(this.get(n), a, b, c, d)
    }
    i1(n: string, a: number) {
        if (this.changed(n, a, -1)) this.gl.uniform1i(this.get(n), a)
    }
    v4(n: string, data: Float32Array) {
        if (this.changed(n, -7, data.length)) this.gl.uniform4fv(this.get(n), data)
    }
}

interface Target {
    tex: WebGLTexture
    fbo: WebGLFramebuffer
    w: number
    h: number
}

type Shape = [number, number, number, number]

function shapeOf(ph: number, out: Shape): Shape {
    const lean0 = ADV.lean / 100
    const lean = lean0 + (ADV.twist / 100) * 5 * Math.sin(ph) * (lean0 > 0 ? 1 : 0)
    out[0] = (1 + lean) / 2
    out[1] = (1 - lean) / 2
    out[2] = (1.5 - P.pinch / 100) * (1 + (ADV.breathe / 100) * Math.sin(ph))
    out[3] = ADV.waistY / 100 - WAIST0
    return out
}

// ── 렌더러 — 한 번 만들고 켜고 끈다 ────────────────────────────────────────────
interface Programs {
    glint: WebGLProgram
    dust: WebGLProgram
    down: WebGLProgram
    blur: WebGLProgram
    comp: WebGLProgram
    field: WebGLProgram
}

const still = matchMedia("(prefers-reduced-motion: reduce)")
let canvas: HTMLCanvasElement | null = null
let gl: WebGL2RenderingContext | null = null
let prog: Programs | null = null
let U: Record<keyof Programs, Uniforms> | null = null
let quadVao: WebGLVertexArrayObject | null = null
let emptyVao: WebGLVertexArrayObject | null = null
let envTex: WebGLTexture | null = null
let fibTex: WebGLTexture | null = null
let bedTex: WebGLTexture | null = null
let fibKey = ""
let scene: Target | null = null
const q4: (Target | null)[] = [null, null]
const q8: (Target | null)[] = [null, null]
let floatOK = false
let packedOK = true
let lost = false
let failed = false
let off = 0

let W = 0
let H = 0
let quality = 0
let bufW = 0
let bufH = 0
let pxPerCss = 1
let resizePending = true

const map = { unit: 1, cx: 0, cy: 0, ca: 1, sa: 0, tilt: 0, persp: 1 }

let raf = 0
let running = false
let clock = 0
let flowPos = 0
let lastTick = -1
let due = 0
let lastDrawAt = 0
let lateEma = 1
let goodFor = 0
let slowFor = 0
let banUntil = 0
let warm = 0

function makeTarget(w: number, h: number, float: boolean): Target | null {
    if (!gl) return null
    const tex = gl.createTexture()
    const fbo = gl.createFramebuffer()
    if (!tex || !fbo) return null
    gl.bindTexture(gl.TEXTURE_2D, tex)
    if (float && packedOK) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R11F_G11F_B10F, w, h, 0, gl.RGB, gl.HALF_FLOAT, null)
    else gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (!ok) {
        gl.deleteTexture(tex)
        gl.deleteFramebuffer(fbo)
        if (float && packedOK) {
            packedOK = false
            return makeTarget(w, h, float)
        }
        return null
    }
    return { tex, fbo, w, h }
}
function dropTarget(t: Target | null) {
    if (!t || !gl) return
    gl.deleteTexture(t.tex)
    gl.deleteFramebuffer(t.fbo)
}

function initGL(): boolean {
    if (!canvas) return false
    gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
    })
    if (!gl) return false
    try {
        prog = {
            glint: compile(gl, GLINT_VS, GLINT_FS),
            dust: compile(gl, DUST_VS, DUST_FS),
            down: compile(gl, QUAD_VS, DOWN_FS),
            blur: compile(gl, QUAD_VS, BLUR_FS),
            comp: compile(gl, QUAD_VS, COMP_FS),
            field: compile(gl, QUAD_VS, FIELD_FS),
        }
    } catch (e) {
        if (!gl.isContextLost()) console.error("hourglass:", e)
        gl = null
        return false
    }
    const g = gl
    const p = prog
    U = {
        glint: new Uniforms(g, p.glint),
        dust: new Uniforms(g, p.dust),
        down: new Uniforms(g, p.down),
        blur: new Uniforms(g, p.blur),
        comp: new Uniforms(g, p.comp),
        field: new Uniforms(g, p.field),
    }
    floatOK = !!g.getExtension("EXT_color_buffer_float") || !!g.getExtension("EXT_color_buffer_half_float")
    g.getExtension("OES_texture_float_linear")
    const quad = g.createBuffer()
    quadVao = g.createVertexArray()
    g.bindVertexArray(quadVao)
    g.bindBuffer(g.ARRAY_BUFFER, quad)
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW)
    g.enableVertexAttribArray(0)
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0)
    emptyVao = g.createVertexArray()
    g.bindVertexArray(null)

    envTex = g.createTexture()
    g.bindTexture(g.TEXTURE_2D, envTex)
    g.pixelStorei(g.UNPACK_ALIGNMENT, 1)
    g.texImage2D(g.TEXTURE_2D, 0, g.R8, ENV_U, ENV_Y, 0, g.RED, g.UNSIGNED_BYTE, envData())
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE)
    fibTex = g.createTexture()
    bedTex = g.createTexture()
    for (const t of [fibTex, bedTex]) {
        g.bindTexture(g.TEXTURE_2D, t)
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR)
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR)
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE)
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.REPEAT)
    }
    fibKey = ""
    packedOK = true
    scene = null
    q4[0] = q4[1] = q8[0] = q8[1] = null
    bufW = bufH = 0
    for (const k of ["glint", "dust", "field"] as const) {
        g.useProgram(p[k])
        U[k].v4("uFc", FLOW_COEF)
    }
    return true
}

function applyResize() {
    resizePending = false
    if (!gl || W <= 0 || H <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let k = dpr * QUALITY_LEVELS[quality]
    const px = W * H * k * k
    if (px > MAX_PIXELS) k *= Math.sqrt(MAX_PIXELS / px)
    const bw = Math.max(1, Math.round(W * k))
    const bh = Math.max(1, Math.round(H * k))
    pxPerCss = bw / W
    if (bw === bufW && bh === bufH && scene) return
    bufW = bw
    bufH = bh
    canvas!.width = bw
    canvas!.height = bh
    for (const t of [scene, q4[0], q4[1], q8[0], q8[1]]) dropTarget(t)
    scene = makeTarget(bw, bh, floatOK)
    if (!scene && floatOK) {
        floatOK = false
        scene = makeTarget(bw, bh, false)
    }
    const w4 = Math.max(1, Math.ceil(bw / 4))
    const h4 = Math.max(1, Math.ceil(bh / 4))
    const w8 = Math.max(1, Math.ceil(bw / 8))
    const h8 = Math.max(1, Math.ceil(bh / 8))
    q4[0] = makeTarget(w4, h4, floatOK)
    q4[1] = makeTarget(w4, h4, floatOK)
    q8[0] = makeTarget(w8, h8, floatOK)
    q8[1] = makeTarget(w8, h8, floatOK)
}

function updateMap() {
    const pl = P.placement
    // Contain the 1200×800 composition: S is its height, the poster's height at 100%.
    const S = Math.min(H, W / REF_ASPECT)
    map.unit = S * (P.scale / 100)
    map.cx = W / 2 + (pl.x / 100) * W
    map.cy = H / 2 + (pl.y / 100) * H
    const ang = (pl.angle * Math.PI) / 180
    map.ca = Math.cos(ang)
    map.sa = Math.sin(ang)
    map.tilt = (pl.tilt * Math.PI) / 180
    map.persp = TILT_PERSPECTIVE * Math.max(W, H, 1)
}

const shapeTmp: Shape = [0, 0, 0, 0]
function setFlowUniforms(u: Uniforms, ph: number) {
    const sh = shapeOf(ph, shapeTmp)
    u.f4("uShape", sh[0], sh[1], sh[2], sh[3])
    u.f4("uMap", map.ca, map.sa, map.tilt, map.persp)
    u.f4("uMap2", map.unit, map.cx, map.cy, pxPerCss)
    u.f2("uFrame", W, H)
    u.f4("uDof", 0.475, 0.17, 0.011 * (ADV.defocus / 100), 0.45 * ADV.streakWidth)
    u.i1("uEnv", 7)
}

function pass(t: Target | null, p: WebGLProgram) {
    if (!gl || !t) return
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
    gl.viewport(0, 0, t.w, t.h)
    gl.useProgram(p)
    gl.bindVertexArray(quadVao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
}

// 색은 고정이라 한 번만 계산한다
const coreE = asLight(parseColor(ADV.coreColor, [1, 0.91, 0.82]))
const baseE = asLight(parseColor(P.baseColor, [1, 0.54, 0.23]))
const accE = asLight(parseColor(P.accentColor, [0.37, 0.88, 0.88]))
const vioE = asLight(parseColor(ADV.violetColor, [0.54, 0.42, 1]))
const midE = asLight(parseColor(ADV.midColor, [0.55, 0.42, 0.38]))
const hazeE = asLight(parseColor(ADV.hazeColor, [0.43, 0.25, 0.2]))
const dustE = asLight(parseColor(ADV.dustColor, [0.85, 0.82, 0.78]))
const bg = parseColorA(P.background, [0.075, 0.07, 0.07])

function draw() {
    if (resizePending) applyResize()
    if (!gl || lost || !prog || !U || !scene || W <= 0 || H <= 0) return
    const g = gl
    updateMap()
    const seed = ADV.seed
    const dens = P.density / 100
    const lanesBase = ADV.lanes
    const NL = Math.max(2, Math.round(lanesBase * dens))

    const nFib = Math.max(6, Math.round(lanesBase * FIBRES_PER_LANE * dens))
    const nBed = Math.max(8, Math.round(lanesBase * BED_PER_LANE * dens))
    const fk = `${nFib}|${nBed}|${seed}`
    if (fk !== fibKey) {
        fibKey = fk
        const fib = buildFibres(nFib, nBed, seed)
        g.pixelStorei(g.UNPACK_ALIGNMENT, 1)
        g.bindTexture(g.TEXTURE_2D, fibTex)
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, FIB_W, FIB_H, 0, g.RGBA, g.UNSIGNED_BYTE, fib.bright)
        g.generateMipmap(g.TEXTURE_2D)
        g.bindTexture(g.TEXTURE_2D, bedTex)
        g.texImage2D(g.TEXTURE_2D, 0, g.R8, FIB_W, FIB_H, 0, g.RED, g.UNSIGNED_BYTE, fib.bed)
        g.generateMipmap(g.TEXTURE_2D)
    }

    const ph = (2 * Math.PI * clock) / (ADV.breathePeriod / 1000)
    const outScale = floatOK ? 1 : 0.25
    const fringeK = P.fringe / 100

    g.activeTexture(g.TEXTURE7)
    g.bindTexture(g.TEXTURE_2D, envTex)

    // ── Light buffer: fibres and haze, then glints and glitter added on top ──
    const uF = U.field
    g.bindFramebuffer(g.FRAMEBUFFER, scene.fbo)
    g.viewport(0, 0, scene.w, scene.h)
    g.useProgram(prog.field)
    setFlowUniforms(uF, ph)
    g.activeTexture(g.TEXTURE3)
    g.bindTexture(g.TEXTURE_2D, fibTex)
    g.activeTexture(g.TEXTURE4)
    g.bindTexture(g.TEXTURE_2D, bedTex)
    uF.i1("uFib", 3)
    uF.i1("uBed", 4)
    uF.f2("uBuf", bufW, bufH)
    const fibK = ADV.fibres / 100
    const fibGain = fibK * 34 * Math.pow(110 / nFib, 0.5)
    const bedGain = fibK * 18 * Math.pow(184 / nBed, 0.5)
    uF.f4("uFibP", flowPos * 0.6, bedGain, fibGain, 1.6 * fringeK)
    uF.f3("uMidE", midE[0], midE[1], midE[2])
    const atCore = (c: RGB, k: number): RGB => {
        const m = (k * coreE[0]) / Math.max(c[0], c[1], c[2], 1e-3)
        return [c[0] * m, c[1] * m, c[2] * m]
    }
    const kinds: RGB[] = [coreE, atCore(baseE, 0.8), atCore(accE, 1), atCore(vioE, 1)]
    uF.f3("uK0", kinds[0][0], kinds[0][1], kinds[0][2])
    uF.f3("uK1", kinds[1][0], kinds[1][1], kinds[1][2])
    uF.f3("uK2", kinds[2][0], kinds[2][1], kinds[2][2])
    uF.f3("uK3", kinds[3][0], kinds[3][1], kinds[3][2])
    const cool = (k: RGB): RGB => [k[0] * 0.25 + coreE[0] * 0.75, k[1] * 0.25 + coreE[1] * 0.75, k[2] * 0.25 + coreE[2] * 0.75]
    const k2s = cool(kinds[2])
    const k3s = cool(kinds[3])
    uF.f3("uK2s", k2s[0], k2s[1], k2s[2])
    uF.f3("uK3s", k3s[0], k3s[1], k3s[2])
    const hazeAmt = (ADV.haze / 100) * 1.35
    const nrm = (c: RGB): RGB => {
        const m = Math.max(c[0], c[1], c[2], 1e-3)
        return [c[0] / m, c[1] / m, c[2] / m]
    }
    const hazeN = nrm(hazeE)
    uF.f4("uHazeN", hazeN[0], hazeN[1], hazeN[2], Math.max(hazeE[0], hazeE[1], hazeE[2]) * hazeAmt)
    const coreN = nrm(coreE)
    const baseN = nrm(baseE)
    uF.f3("uCoreN", coreN[0], coreN[1], coreN[2])
    uF.f3("uBaseN", baseN[0], baseN[1], baseN[2])
    uF.f2("uField", 0.94 + 0.06 * Math.sin(ph), outScale)
    g.bindVertexArray(quadVao)
    g.drawArrays(g.TRIANGLES, 0, 3)
    g.enable(g.BLEND)
    g.blendFunc(g.ONE, g.ONE)
    g.bindVertexArray(emptyVao)

    const cell = Math.max(0.03, ADV.streakLength / 100) * 1.4
    const NS = Math.max(1, Math.min(64, Math.ceil(RANGE_LEN / cell)))
    const uG = U.glint
    g.useProgram(prog.glint)
    setFlowUniforms(uG, ph)
    uG.f4("uGl", NL, NS, RANGE_LEN / NS, RANGE_Y0)
    uG.f4("uGl2", RANGE_LEN, flowPos, ADV.occupancy / 100, seed)
    uG.f4("uGl3", 0.45 * ADV.streakWidth, 3.2 * Math.pow(46 / NL, 0.5), ADV.cyanShare / 100, ADV.violetShare / 100)
    uG.f4("uGl4", ADV.flicker / 100, clock, 0.45 * fringeK, 0.6 * fringeK)
    const gBase = atCore(baseE, 0.8)
    const gAcc = atCore(accE, 1)
    const gVio = atCore(vioE, 1)
    uG.f3("uCoreE", coreE[0], coreE[1], coreE[2])
    uG.f3("uBaseE", gBase[0], gBase[1], gBase[2])
    uG.f3("uAccE", gAcc[0], gAcc[1], gAcc[2])
    uG.f3("uVioE", gVio[0], gVio[1], gVio[2])
    uG.f1("uOut", outScale)
    g.drawArraysInstanced(g.TRIANGLES, 0, GLINT_SEG * 6, NL * NS)

    const dustAmt = ADV.dust / 50
    if (dustAmt > 0) {
        const zoom = Math.min(3, Math.max(0.03, (map.unit / REF_H) ** 2))
        const nDust = Math.round(DUST_PER_UNIT * RANGE_LEN * Math.min(2, dustAmt) * zoom)
        const uD = U.dust
        g.useProgram(prog.dust)
        setFlowUniforms(uD, ph)
        uD.f4("uDu", RANGE_LEN, flowPos, Math.max(1, 0.75 * pxPerCss), 1.1 * Math.max(1, dustAmt / 2))
        uD.f4("uDu2", seed, clock, RANGE_Y0, 0.06)
        uD.f3("uDustE", dustE[0], dustE[1], dustE[2])
        uD.f1("uOut", outScale)
        g.drawArrays(g.POINTS, 0, nDust)
    }
    g.disable(g.BLEND)

    // ── Bloom: ¼ and ⅛ size ──
    const bloomAmt = ADV.bloom / 100
    if (bloomAmt > 0 && q4[0] && q4[1] && q8[0] && q8[1]) {
        const uDn = U.down
        const uB = U.blur
        g.activeTexture(g.TEXTURE0)
        g.useProgram(prog.down)
        uDn.i1("uSrc", 0)
        g.bindTexture(g.TEXTURE_2D, scene.tex)
        uDn.f2("uSrcPx", 1 / scene.w, 1 / scene.h)
        uDn.f2("uDstRes", q4[0].w, q4[0].h)
        pass(q4[0], prog.down)
        g.bindTexture(g.TEXTURE_2D, q4[0].tex)
        uDn.f2("uSrcPx", 1 / q4[0].w, 1 / q4[0].h)
        uDn.f2("uDstRes", q8[0].w, q8[0].h)
        pass(q8[0], prog.down)
        g.useProgram(prog.blur)
        uB.i1("uSrc", 0)
        for (const pair of [q4, q8]) {
            const a = pair[0]
            const b = pair[1]
            if (!a || !b) continue
            uB.f2("uDstRes", a.w, a.h)
            g.bindTexture(g.TEXTURE_2D, a.tex)
            uB.f2("uStep", 1 / a.w, 0)
            pass(b, prog.blur)
            g.bindTexture(g.TEXTURE_2D, b.tex)
            uB.f2("uStep", 0, 1 / a.h)
            pass(a, prog.blur)
        }
    }

    // ── Composite ──
    const uC = U.comp
    g.bindFramebuffer(g.FRAMEBUFFER, null)
    g.viewport(0, 0, bufW, bufH)
    g.useProgram(prog.comp)
    g.activeTexture(g.TEXTURE0)
    g.bindTexture(g.TEXTURE_2D, scene.tex)
    g.activeTexture(g.TEXTURE1)
    g.bindTexture(g.TEXTURE_2D, q4[0] ? q4[0].tex : scene.tex)
    g.activeTexture(g.TEXTURE2)
    g.bindTexture(g.TEXTURE_2D, q8[0] ? q8[0].tex : scene.tex)
    uC.i1("uScene", 0)
    uC.i1("uBloomA", 1)
    uC.i1("uBloomB", 2)
    uC.f2("uBuf", bufW, bufH)
    uC.f4("uLook", ADV.exposure / 140, Math.min(0.9, 0.6 * bloomAmt), 1 / outScale, pxPerCss)
    uC.f4("uBg", bg.c[0], bg.c[1], bg.c[2], bg.a)
    uC.f4("uFx", (ADV.grain / 100) * 0.12, ADV.vignette / 100, 0.06 * (ADV.stars / 50), clock)
    uC.f3("uDustE", dustE[0], dustE[1], dustE[2])
    uC.f1("uSeed", seed)
    g.bindVertexArray(quadVao)
    g.drawArrays(g.TRIANGLES, 0, 3)
    g.bindVertexArray(null)
}

/** How often to draw: 60 when streaks cross fast, 30 for slow drift, 0 when still. */
function wantRate(): number {
    const spd = P.speed / 50
    if (still.matches || spd <= 0) return 0
    const flowPx = FLOW_RATE * (ADV.flowSpeed / 100) * spd * map.unit
    return flowPx > SMOOTH_FLOW_PX ? 60 : 30
}

/** Step resolution down when frames run late; win it back later (원본의 화질 조절, GPU 시간 측정은 뺐다). */
function adaptQuality(now: number, period: number, dt: number) {
    if (period <= 0 || warm < 30 || dt <= 0 || dt > 0.25) return
    const late = (dt * 1000) / period
    lateEma = lateEma * 0.9 + late * 0.1
    if (lateEma > 1.3) {
        slowFor += dt
        goodFor = 0
    } else {
        slowFor = 0
        goodFor += dt
    }
    if (slowFor > 0.5 && quality < QUALITY_LEVELS.length - 1) {
        quality++
        slowFor = goodFor = 0
        banUntil = now + 4000
        resizePending = true
    } else if (goodFor > 4 && quality > 0 && now > banUntil) {
        quality--
        goodFor = 0
        banUntil = now + 8000
        resizePending = true
    }
}

function tick(now: number) {
    raf = 0
    if (!running) return
    const dt = lastTick < 0 ? 1 / 60 : Math.min(0.1, (now - lastTick) / 1000)
    lastTick = now
    const spd = P.speed / 50
    if (!still.matches) {
        clock = (clock + dt * spd) % 36000
        flowPos = (flowPos + dt * spd * FLOW_RATE * (ADV.flowSpeed / 100)) % 3600
    }
    const rate = wantRate()
    const period = rate > 0 ? 1000 / rate : 0
    if (rate > 0 && now >= due - 3) {
        due += period
        if (due < now - period) due = now + period
        adaptQuality(now, period, lastDrawAt > 0 ? (now - lastDrawAt) / 1000 : 0)
        lastDrawAt = now
        draw()
        warm++
    }
    if (rate > 0) raf = requestAnimationFrame(tick)
    else running = false
}

function start() {
    if (running || lost || !gl || document.hidden) return
    running = true
    lastTick = -1
    due = 0
    lastDrawAt = 0
    raf = requestAnimationFrame(tick)
}
function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
}

function measure() {
    W = window.innerWidth
    H = window.innerHeight
    resizePending = true
}

function ensure(): boolean {
    if (canvas) return !!gl
    if (failed) return false
    canvas = document.createElement("canvas")
    canvas.className = "hourglass"
    canvas.setAttribute("aria-hidden", "true")
    document.body.prepend(canvas)
    if (!initGL()) {
        // WebGL2 가 없으면 효과 없이 다크 바탕만 — 캔버스는 지운다
        failed = true
        canvas.remove()
        canvas = null
        return false
    }
    canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault()
        lost = true
        stop()
    })
    canvas.addEventListener("webglcontextrestored", () => {
        lost = false
        if (initGL() && canvas?.classList.contains("on")) {
            resizePending = true
            draw()
            start()
        }
    })
    addEventListener("resize", () => {
        measure()
        // Resize and repaint together, before the browser shows a wiped buffer.
        if (canvas?.classList.contains("on")) draw()
    })
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop()
        else if (canvas?.classList.contains("on")) start()
    })
    measure()
    return true
}

/** 지금 빛의 흐름 위치 — 다크인 채로 페이지를 옮길 때 다음 페이지가 이어 그린다 (D-041) */
export const flow = () => ({ clock, flowPos })
export const isOn = () => !!canvas?.classList.contains("on")

/**
 * 켠다 — 첫 장을 바로 그린 뒤(움직임 줄이기면 그 한 장만) 서서히 드러낸다.
 * resume — 앞 페이지가 남긴 흐름 위치 · 시각. 있으면 떠난 뒤 흐른 시간만큼 앞으로 당겨 이어 그리고,
 * 처음 켤 때(1.7초)보다 빠르게 ARRIVE_FADE 에 서서히 드러낸다 (D-042 — D-041 의 「곧바로」를 사용자 지시로 바꿈)
 */
export function show(resume?: { clock: number; flowPos: number; at: number }) {
    clearTimeout(off)
    if (resume && !still.matches) {
        const dt = Math.max(0, (Date.now() - resume.at) / 1000)
        const spd = P.speed / 50
        clock = (resume.clock + dt * spd) % 36000
        flowPos = (resume.flowPos + dt * spd * FLOW_RATE * (ADV.flowSpeed / 100)) % 3600
    }
    if (!ensure() || !canvas) return
    draw()
    start()
    if (resume) canvas.style.transition = `opacity ${ARRIVE_FADE}ms ease`
    void canvas.offsetWidth // 방금 만든 캔버스도 투명에서 출발하게 한 번 배치한 뒤 켠다
    canvas.classList.add("on")
    if (resume) window.setTimeout(() => { if (canvas) canvas.style.transition = "" }, ARRIVE_FADE + 50)
}
/** 다크인 채로 페이지를 옮겨 왔을 때 드러나는 시간 — 처음 켤 때(theme-dark.css 1.7초)보다 빠르게 (D-042) */
const ARRIVE_FADE = 600

/** 끈다 — dur 동안 사라진 뒤 그리기를 멈춘다. */
export function hide(dur = 600) {
    if (!canvas) return
    canvas.classList.remove("on")
    clearTimeout(off)
    off = window.setTimeout(stop, dur + 50)
}
