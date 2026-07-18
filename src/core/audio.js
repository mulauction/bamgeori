// ══════════════════════════════════════════════════════════════
//  audio.js — WebAudio 코드 합성 사운드 (외부 파일 없음)
//  오실레이터·노이즈 합성으로 효과음/루프를 생성한다.
//  모바일 웹뷰 정책: 반드시 첫 유저 제스처에서 unlock() 후 재생.
//  음소거 상태는 store 어댑터 경유로 저장(main에서 주입).
// ══════════════════════════════════════════════════════════════

let ctx = null;
let master = null;
let muted = false;
let unlocked = false;
const loops = {}; // name -> stopFn

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

// 단음: 주파수/길이/파형/게인, glideTo로 활강
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

// 노이즈 버스트 (필터드) — 타격/발소리용
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

function melody(notes, t0, { type = 'triangle', step = 0.12, dur = 0.16, gain = 0.28 } = {}) {
  notes.forEach((f, i) => tone(f, t0 + i * step, dur, { type, gain }));
}

// ── 원샷 효과음 ─────────────────────────────────────────────
const ONESHOT = {
  chip() {
    const t = ctx.currentTime;
    tone(880, t, 0.05, { type: 'square', gain: 0.15 });
    noise(t, 0.05, { gain: 0.1, freq: 3000, type: 'highpass' });
  },
  fanfare() {
    melody([523, 659, 784], ctx.currentTime, { type: 'square', gain: 0.2 });
  },
  bigwin() {
    const t = ctx.currentTime;
    melody([523, 659, 784, 1047], t, { type: 'square', step: 0.1, gain: 0.24 });
    tone(1568, t + 0.4, 0.3, { type: 'triangle', gain: 0.2 });
  },
  jackpot() {
    const t = ctx.currentTime;
    melody([523, 659, 784, 1047, 784, 1047, 1319], t, { type: 'square', step: 0.13, dur: 0.18, gain: 0.26 });
    tone(2093, t + 1.0, 0.5, { type: 'triangle', gain: 0.22 });
    noise(t + 1.0, 0.4, { gain: 0.12, freq: 6000, type: 'highpass' });
  },
  lose() {
    const t = ctx.currentTime;
    tone(330, t, 0.35, { type: 'triangle', gain: 0.18, glideTo: 165 });
  },
  win() {
    ONESHOT.fanfare();
  },
  footstep() {
    noise(ctx.currentTime, 0.08, { gain: 0.08, freq: 500, type: 'lowpass' });
  },
};

// ── 루프 (앰비언스/긴장) ────────────────────────────────────
function startAmbience() {
  if (loops.ambience) return;
  // 낮은 도시 험(지속 저음) + 주기적 귀뚜라미 칩
  const hum = ctx.createOscillator();
  const hg = ctx.createGain();
  hum.type = 'sawtooth';
  hum.frequency.value = 55;
  hg.gain.value = 0.03;
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
    // 귀뚜라미: 짧은 고음 두 번
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
  // 심장박동 저음 펄스
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

export const audio = {
  // 첫 유저 제스처에서 호출
  unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
  },
  isUnlocked() {
    return unlocked;
  },

  play(name) {
    if (!ctx || muted || !unlocked) return;
    ONESHOT[name]?.();
  },

  startLoop(name) {
    if (!ctx || !unlocked) return;
    if (name === 'ambience') startAmbience();
    else if (name === 'tension') startTension();
  },
  stopLoop(name) {
    loops[name]?.();
  },

  setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : 0.45;
  },
  isMuted() {
    return muted;
  },
};
