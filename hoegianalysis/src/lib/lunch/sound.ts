// 외부 파일 없이 Web Audio로 효과음을 합성한다
let ctx: AudioContext | null = null;
let muted = false;
let noise: AudioBuffer | null = null;

try {
  muted = localStorage.getItem('lunch-mute') === '1';
} catch {
  /* 저장소를 못 쓰면 소리 켠 채로 */
}

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem('lunch-mute', v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function ac(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 첫 터치에서 오디오를 깨운다 (iOS 정책) */
export function unlockAudio() {
  ac();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(dur: number, vol: number, at: number, freq: number, q = 1) {
  const c = ac();
  if (!c) return;
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

export const sfx = {
  /** 버튼 클릭: 짧은 팝 */
  click() {
    tone(520, 0.07, 'square', 0.06, 0, 880);
  },
  /** 질문 통과: 올라가는 두 음 */
  next() {
    tone(660, 0.08, 'triangle', 0.09);
    tone(990, 0.1, 'triangle', 0.09, 0.07);
  },
  /** 레버 한 칸 돌아가는 소리 (띠리릭의 한 틱) */
  tick() {
    tone(1500 + Math.random() * 200, 0.025, 'square', 0.035);
    burst(0.03, 0.05, 0, 3000, 2);
  },
  /** 레버를 다 돌렸을 때 연속 띠리릭 */
  ratchet(count = 14, span = 0.9) {
    for (let i = 0; i < count; i++) {
      const at = (i / count) * span;
      tone(1300 + (i % 3) * 120, 0.03, 'square', 0.04, at);
      burst(0.03, 0.05, at, 2800, 2);
    }
  },
  /** 캡슐이 섞이며 구르는 소리 */
  rumble(dur = 2) {
    for (let i = 0; i < dur * 9; i++) {
      const at = i * 0.11 + Math.random() * 0.05;
      burst(0.09, 0.07 + Math.random() * 0.05, at, 500 + Math.random() * 900, 1.5);
      if (i % 3 === 0) tone(300 + Math.random() * 250, 0.06, 'sine', 0.05, at);
    }
  },
  /** 배출구로 캡슐이 툭 떨어지고 굴러가는 소리 */
  drop() {
    tone(240, 0.14, 'sine', 0.2, 0, 90);
    burst(0.1, 0.12, 0, 900, 1);
    tone(180, 0.09, 'sine', 0.12, 0.2, 80);
    tone(150, 0.07, 'sine', 0.08, 0.32, 70);
    for (let i = 0; i < 5; i++) burst(0.06, 0.05, 0.4 + i * 0.07, 700, 2);
  },
  /** 캡슐이 열리는 팝 */
  pop() {
    tone(300, 0.12, 'sine', 0.2, 0, 900);
    burst(0.12, 0.15, 0, 2500, 0.8);
  },
  /** 결과 공개 팡파르 */
  fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      tone(f, 0.16, 'square', 0.07, i * 0.11);
      tone(f * 2, 0.16, 'triangle', 0.04, i * 0.11);
    });
    [784, 988, 1175, 1568].forEach((f) => tone(f, 0.7, 'triangle', 0.08, 0.5));
    tone(523, 0.7, 'square', 0.05, 0.5);
  },
  /** 도장 쾅 */
  stamp() {
    tone(120, 0.18, 'sine', 0.25, 0, 50);
    burst(0.08, 0.15, 0, 400, 0.7);
  },
  /** 펜으로 서명하는 사각거림 */
  scribble() {
    burst(0.07, 0.05, 0, 3500, 1.2);
  },
  /** 종이가 슥 넘어가는 소리 */
  paper() {
    burst(0.18, 0.09, 0, 2200, 0.6);
    tone(500, 0.12, 'sine', 0.04, 0.02, 250);
  },
  /** 던지는 휙 소리 */
  whoosh() {
    burst(0.35, 0.16, 0, 900, 0.5);
    tone(900, 0.35, 'sawtooth', 0.03, 0, 200);
  },
  /** 화면에 퍽 부딪히는 소리 */
  thud() {
    tone(110, 0.25, 'sine', 0.4, 0, 40);
    burst(0.12, 0.25, 0, 300, 0.6);
  },
  /** 의사의 고함 */
  shout() {
    tone(220, 0.4, 'sawtooth', 0.12, 0, 160);
    tone(330, 0.4, 'square', 0.05, 0.02, 220);
    burst(0.3, 0.1, 0, 1200, 0.8);
  },
  /** 휠체어 바퀴 구르는 소리 */
  wheel() {
    for (let i = 0; i < 12; i++) {
      burst(0.05, 0.05, i * 0.1, 700, 3);
      tone(160 + i * 6, 0.05, 'triangle', 0.03, i * 0.1);
    }
  },
  /** 한숨 */
  sigh() {
    burst(0.7, 0.07, 0, 600, 0.4);
  },
};
