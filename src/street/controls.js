// ══════════════════════════════════════════════════════════════
//  street/controls.js — 조작 입력
//  왼손 가상 조이스틱 · 화면 드래그 시점 회전 · 점프 버튼 · 키보드(WASD/화살표/스페이스/Enter)
//  카메라 요/피치(camYaw/camPitch)를 직접 보유하고, 이동 입력을 노출한다.
// ══════════════════════════════════════════════════════════════

/**
 * @param {object} opts
 * @param {()=>void} [opts.onEnter] Enter 키로 상점 입장 시도
 * @returns 입력 상태 객체
 */
export function createControls({ onEnter } = {}) {
  const canvas = document.getElementById('gl');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  const jumpBtn = document.getElementById('jump');

  // 카메라 방향 (드래그로 갱신)
  const cam = { yaw: 0, pitch: 0.32 };
  const keys = {};
  let jumpQueued = false;

  // ── 왼손 조이스틱 ──
  const joy = { id: null, vx: 0, vz: 0 };
  function setKnob(dx, dy) {
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  }
  function joyMove(t) {
    const r = stick.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 16;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob(dx, dy);
    joy.vx = dx / max;
    joy.vz = dy / max;
  }
  stick.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joy.id = t.identifier;
      joyMove(t);
    },
    { passive: false }
  );

  // ── 시점 드래그 ──
  const look = { id: null, px: 0, py: 0, mouse: false };
  function lookDelta(nx, ny) {
    cam.yaw -= (nx - look.px) * 0.006;
    cam.pitch += (ny - look.py) * 0.005;
    cam.pitch = Math.max(-0.35, Math.min(1.35, cam.pitch));
    look.px = nx;
    look.py = ny;
  }
  canvas.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      if (look.id === null) {
        look.id = t.identifier;
        look.px = t.clientX;
        look.py = t.clientY;
      }
    },
    { passive: true }
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) {
          e.preventDefault();
          joyMove(t);
        } else if (t.identifier === look.id) {
          lookDelta(t.clientX, t.clientY);
        }
      }
    },
    { passive: false }
  );
  function touchDone(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        joy.id = null;
        joy.vx = joy.vz = 0;
        setKnob(0, 0);
      }
      if (t.identifier === look.id) look.id = null;
    }
  }
  window.addEventListener('touchend', touchDone);
  window.addEventListener('touchcancel', touchDone);

  // 마우스(PC)
  canvas.addEventListener('mousedown', (e) => {
    look.mouse = true;
    look.px = e.clientX;
    look.py = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (look.mouse) lookDelta(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => (look.mouse = false));

  // ── 점프 ──
  function queueJump() {
    jumpQueued = true;
  }
  jumpBtn.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      queueJump();
    },
    { passive: false }
  );
  jumpBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    queueJump();
  });

  // ── 키보드(PC) ──
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') queueJump();
    if (e.key === 'Enter') onEnter?.();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  return {
    cam,
    // 조이스틱 + 키보드를 합친 이동 입력
    getMoveInput() {
      let ix = joy.vx;
      let iz = joy.vz;
      if (keys['ArrowLeft'] || keys['a']) ix -= 1;
      if (keys['ArrowRight'] || keys['d']) ix += 1;
      if (keys['ArrowUp'] || keys['w']) iz -= 1;
      if (keys['ArrowDown'] || keys['s']) iz += 1;
      return { ix, iz };
    },
    // 점프 요청을 한 번 소비
    consumeJump() {
      if (jumpQueued) {
        jumpQueued = false;
        return true;
      }
      return false;
    },
  };
}
