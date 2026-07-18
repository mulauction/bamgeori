// ══════════════════════════════════════════════════════════════
//  audio.js — 사운드 (코드 합성 기본 + 유저 에셋 오버라이드)
//  · 기본: WebAudio 오실레이터/노이즈 합성(외부 파일 불필요)
//  · 오버라이드: public/audio/<name>.mp3 가 있으면 그 파일을 대신 재생
//    (사장님이 음악/효과음을 넣으면 자동 사용). 파일 없으면 합성음으로 폴백.
//  모바일 웹뷰 정책: 첫 유저 제스처에서 unlock() 후 재생. 음소거는 store 저장.
// ══════════════════════════════════════════════════════════════

const MASTER_VOL = 0.85;

let ctx = null;
let master = null;
let muted = false;
let unlocked = false;
const loops = {}; // name -> stopFn
const buffers = {}; // name -> AudioBuffer (유저 오버라이드)

// public/audio/<name>.mp3 로 교체 가능한 사운드 이름
const OVERRIDABLE = [
  'chip', 'fanfare', 'bigwin', 'jackpot', 'lose', 'cheer', 'beep', 'start', 'riser', 'footstep',
  'ambience', 'tension', 'crowd', 'bgm-yabawi', 'bgm-race', 'bgm-fight',
];

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

// ── 합성 프리미티브 ─────────────────────────────────────────
function tone(freq, t0, dur, { type = 'sine', gain = 0.25, glideTo = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(t0, dur, { gain = 0.2, freq = 1200, type = 'lowpass' } = {}) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// 스웰(어택 후 감쇠) 밴드패스 노이즈 — 환호/함성용
function noiseSwell(t0, dur, { gain = 0.2, freq = 800, q = 0.8, attack = 0.3 } = {}) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function melody(notes, t0, { type = 'triangle', step = 0.12, dur = 0.16, gain = 0.28 } = {}) {
  notes.forEach((f, i) => tone(f, t0 + i * step, dur, { type, gain }));
}

// 오버라이드 버퍼 재생
function playBuffer(buf, { loop = false, gain = 0.9 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(master);
  src.start();
  return {
    stop() {
      try {
        src.stop();
      } catch {
        /* 이미 정지 */
      }
    },
  };
}

// ── 원샷 효과음 ─────────────────────────────────────────────
const ONESHOT = {
  chip() {
    const t = ctx.currentTime;
    tone(880, t, 0.05, { type: 'square', gain: 0.15 });
    noise(t, 0.05, { gain: 0.1, freq: 3000, type: 'highpass' });
  },
  fanfare() {
    melody([523, 659, 784], ctx.currentTime, { type: 'square', gain: 0.24 });
  },
  bigwin() {
    const t = ctx.currentTime;
    melody([523, 659, 784, 1047], t, { type: 'square', step: 0.1, gain: 0.28 });
    tone(1568, t + 0.4, 0.3, { type: 'triangle', gain: 0.24 });
  },
  jackpot() {
    const t = ctx.currentTime;
    melody([523, 659, 784, 1047, 784, 1047, 1319], t, { type: 'square', step: 0.13, dur: 0.18, gain: 0.3 });
    tone(2093, t + 1.0, 0.5, { type: 'triangle', gain: 0.26 });
    noise(t + 1.0, 0.4, { gain: 0.14, freq: 6000, type: 'highpass' });
  },
  lose() {
    tone(330, ctx.currentTime, 0.35, { type: 'triangle', gain: 0.18, glideTo: 165 });
  },
  win() {
    ONESHOT.fanfare();
  },
  footstep() {
    noise(ctx.currentTime, 0.09, { gain: 0.18, freq: 420, type: 'lowpass' });
  },
  // ── 승부 긴장/환호 ──
  beep() {
    tone(760, ctx.currentTime, 0.12, { type: 'square', gain: 0.32 });
  },
  start() {
    const t = ctx.currentTime;
    tone(200, t, 0.4, { type: 'square', gain: 0.3, glideTo: 80 });
    noise(t, 0.14, { gain: 0.3, freq: 2600, type: 'highpass' });
  },
  cheer() {
    const t = ctx.currentTime;
    noiseSwell(t, 1.8, { gain: 0.28, freq: 950, q: 0.7, attack: 0.22 });
    for (let i = 0; i < 12; i++) tone(500 + Math.random() * 900, t + Math.random() * 1.4, 0.18, { type: 'sawtooth', gain: 0.06 });
  },
  riser() {
    const t = ctx.currentTime;
    tone(150, t, 1.5, { type: 'sawtooth', gain: 0.16, glideTo: 760 });
    noiseSwell(t, 1.5, { gain: 0.1, freq: 1600, q: 0.5, attack: 0.9 });
  },
};

// ── 루프 ────────────────────────────────────────────────────
function startAmbience() {
  if (loops.ambience) return;
  const hum = ctx.createOscillator();
  const hg = ctx.createGain();
  hum.type = 'sawtooth';
  hum.frequency.value = 55;
  hg.gain.value = 0.05;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 200;
  hum.connect(lp);
  lp.connect(hg);
  hg.connect(master);
  hum.start();
  const iv = setInterval(() => {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(4200 + Math.random() * 400, t, 0.03, { type: 'sine', gain: 0.04 });
    tone(4200, t + 0.06, 0.03, { type: 'sine', gain: 0.04 });
  }, 1400);
  loops.ambience = () => {
    clearInterval(iv);
    try {
      hum.stop();
    } catch {
      /* 이미 정지 */
    }
    delete loops.ambience;
  };
}

function startTension() {
  if (loops.tension) return;
  const iv = setInterval(() => {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(70, t, 0.12, { type: 'sine', gain: 0.16 });
    tone(70, t + 0.18, 0.1, { type: 'sine', gain: 0.1 });
  }, 620);
  loops.tension = () => {
    clearInterval(iv);
    delete loops.tension;
  };
}

// 구경꾼 웅성거림(가게 입장 분위기)
function startCrowd() {
  if (loops.crowd) return;
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 500;
  filt.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0.06;
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start();
  const iv = setInterval(() => {
    if (!ctx) return;
    tone(300 + Math.random() * 400, ctx.currentTime, 0.15, { type: 'sawtooth', gain: 0.03 });
  }, 900);
  loops.crowd = () => {
    clearInterval(iv);
    try {
      src.stop();
    } catch {
      /* 이미 정지 */
    }
    delete loops.crowd;
  };
}

// ── 유저 에셋 오버라이드 로딩 ────────────────────────────────
async function loadOne(name) {
  try {
    const res = await fetch('audio/' + name + '.mp3');
    if (!res.ok) return;
    const arr = await res.arrayBuffer();
    buffers[name] = await ctx.decodeAudioData(arr);
  } catch {
    /* 파일 없음/디코드 실패 → 합성음 폴백 */
  }
}
function loadOverrides() {
  if (!ctx) return;
  OVERRIDABLE.forEach(loadOne);
}

export const audio = {
  unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
    loadOverrides(); // 유저 제공 오디오 파일 있으면 로드
  },
  isUnlocked() {
    return unlocked;
  },

  play(name) {
    if (!ctx || muted || !unlocked) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (buffers[name]) {
      playBuffer(buffers[name]);
      return;
    }
    ONESHOT[name]?.();
  },

  startLoop(name) {
    if (!ctx || !unlocked) return;
    if (loops[name]) return;
    if (buffers[name]) {
      const h = playBuffer(buffers[name], { loop: true, gain: 0.7 });
      loops[name] = () => h.stop();
      return;
    }
    if (name === 'ambience') startAmbience();
    else if (name === 'tension') startTension();
    else if (name === 'crowd') startCrowd();
  },
  stopLoop(name) {
    loops[name]?.();
  },

  setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : MASTER_VOL;
  },
  isMuted() {
    return muted;
  },
};
