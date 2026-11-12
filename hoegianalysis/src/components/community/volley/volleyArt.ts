import { BR, GROUND, H, NET_HALF, NET_TOP, NET_X, PR, W, type Ball, type Player } from '@/lib/volleyEngine';

// 1994년 로스앤젤레스 해 질 녘 해변을 코드로 그린다. 한 번 그려 두고(배경) 매 프레임 복사해 쓴다.
const NAVY = '#14213D';

function sky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 205);
  g.addColorStop(0, '#2a1b5c');
  g.addColorStop(0.35, '#7b2f93');
  g.addColorStop(0.65, '#e8467f');
  g.addColorStop(0.88, '#ff9a4f');
  g.addColorStop(1, '#ffd77a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 215);
  // 별
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [x, y, r] of [[40, 22, 1], [95, 48, 1.2], [160, 18, 1], [210, 60, 0.9], [300, 24, 1.1], [360, 52, 1], [420, 16, 1.2], [455, 44, 0.9], [250, 14, 0.8], [130, 76, 0.8]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sun(ctx: CanvasRenderingContext2D) {
  const cx = 322;
  const cy = 176;
  const r = 50;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.4);
  glow.addColorStop(0, 'rgba(255,214,120,0.55)');
  glow.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, 205);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#fff2a8');
  g.addColorStop(0.5, '#ffc15a');
  g.addColorStop(1, '#ff6f91');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // 레트로 가로줄 (아래로 갈수록 굵게)
  ctx.fillStyle = '#ff8f66';
  for (let i = 0; i < 6; i++) {
    const y = cy + 6 + i * 8;
    ctx.fillRect(cx - r, y, r * 2, 1 + i * 0.9);
  }
  ctx.restore();
}

function hills(ctx: CanvasRenderingContext2D) {
  // 멀리 할리우드 힐스
  ctx.fillStyle = '#5a2f78';
  ctx.beginPath();
  ctx.moveTo(0, 190);
  ctx.lineTo(0, 150);
  ctx.quadraticCurveTo(40, 128, 82, 140);
  ctx.quadraticCurveTo(130, 120, 178, 146);
  ctx.quadraticCurveTo(220, 160, 262, 168);
  ctx.lineTo(480, 176);
  ctx.lineTo(480, 195);
  ctx.closePath();
  ctx.fill();
  // HOLLYWOOD 사인
  ctx.save();
  ctx.font = 'bold 8px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textBaseline = 'alphabetic';
  const text = 'HOLLYWOOD';
  let x = 74;
  for (const ch of text) {
    ctx.fillText(ch, x, 139);
    x += 9.4;
  }
  ctx.restore();
}

function skyline(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#2b1748';
  const towers: [number, number, number][] = [
    [196, 154, 16], [214, 142, 14], [230, 150, 12], [262, 136, 18], [282, 148, 14], [300, 156, 12], [316, 150, 16], [336, 160, 12], [352, 152, 14],
  ];
  for (const [x, top, w] of towers) ctx.fillRect(x, top, w, 195 - top);
  // 라이브러리 타워(왕관 모양 꼭대기)
  ctx.fillRect(240, 126, 18, 70);
  ctx.beginPath();
  ctx.moveTo(240, 126);
  ctx.lineTo(244, 116);
  ctx.lineTo(249, 123);
  ctx.lineTo(254, 114);
  ctx.lineTo(258, 126);
  ctx.closePath();
  ctx.fill();
  // 불 켜진 창
  ctx.fillStyle = 'rgba(255,224,130,0.8)';
  for (let i = 0; i < 46; i++) {
    const x = 198 + ((i * 37) % 150);
    const y = 150 + ((i * 53) % 38);
    ctx.fillRect(x, y, 1.4, 1.8);
  }
}

function ocean(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 190, 0, 232);
  g.addColorStop(0, '#ff9f78');
  g.addColorStop(0.35, '#b24a8f');
  g.addColorStop(1, '#3b2f78');
  ctx.fillStyle = g;
  ctx.fillRect(0, 192, W, 40);
  // 해 반사
  ctx.fillStyle = 'rgba(255,225,150,0.55)';
  for (let i = 0; i < 9; i++) {
    const y = 195 + i * 4.2;
    const w = 54 - i * 4;
    ctx.fillRect(322 - w / 2 + ((i * 7) % 5) - 2, y, w, 1.6);
  }
  // 파도 선
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = 214 + i * 5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.07 + i * 1.7) * 1.4);
    ctx.stroke();
  }
}

function pier(ctx: CanvasRenderingContext2D) {
  // 산타모니카 부두 실루엣
  ctx.fillStyle = '#2b1748';
  ctx.fillRect(0, 206, 175, 4);
  for (let x = 6; x < 172; x += 11) ctx.fillRect(x, 210, 2.2, 14);
  ctx.fillRect(112, 190, 34, 16); // 건물
  ctx.beginPath();
  ctx.moveTo(108, 190);
  ctx.lineTo(129, 178);
  ctx.lineTo(150, 190);
  ctx.closePath();
  ctx.fill(); // 회전목마 지붕
  ctx.fillRect(128, 168, 1.4, 12);
  ctx.fillStyle = '#ff5d73';
  ctx.beginPath();
  ctx.moveTo(129.4, 168);
  ctx.lineTo(139, 171);
  ctx.lineTo(129.4, 174);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b1748';
  ctx.fillRect(70, 196, 22, 10);
  ctx.fillRect(40, 199, 16, 7);
}

function sand(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 228, 0, H);
  g.addColorStop(0, '#f6d9a0');
  g.addColorStop(1, '#e2b673');
  ctx.fillStyle = g;
  ctx.fillRect(0, 228, W, H - 228);
  ctx.fillStyle = 'rgba(160,110,50,0.22)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 97) % W;
    const y = 232 + ((i * 53) % 86);
    ctx.fillRect(x, y, 1.6, 1.2);
  }
  // 바닷물이 닿은 선
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, 228, W, 2);
  // 코트 바닥선
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(18, GROUND - 1, W - 36, 3);
  ctx.fillStyle = 'rgba(120,80,30,0.25)';
  ctx.fillRect(18, GROUND + 2, W - 36, 2);
}

function palm(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, lean: number, flip: number) {
  // 줄기
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  const topX = x + lean * flip;
  const topY = base - h;
  ctx.quadraticCurveTo(x + lean * 0.2 * flip, base - h * 0.55, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const px = x + (topX - x) * t * t;
    const py = base - h * t;
    ctx.beginPath();
    ctx.moveTo(px - 3, py);
    ctx.lineTo(px + 3, py - 1.5);
    ctx.stroke();
  }
  // 잎
  ctx.fillStyle = '#1d5b3a';
  ctx.strokeStyle = '#0f3b25';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.52;
    const len = 46 + (i % 2) * 8;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + len * 0.38;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.55, topY + Math.sin(a) * len * 0.8 - 8, ex, ey);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.55 + 2, topX, topY);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath();
  ctx.arc(topX, topY + 3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function banner(ctx: CanvasRenderingContext2D) {
  // 하늘 위 "L.A. '94"
  ctx.save();
  ctx.font = 'italic 900 20px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  const text = "L.A. '94";
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#2a1b5c';
  ctx.strokeText(text, W / 2, 40);
  const g = ctx.createLinearGradient(0, 24, 0, 42);
  g.addColorStop(0, '#ffe36b');
  g.addColorStop(0.5, '#ff7bb0');
  g.addColorStop(1, '#7be0ff');
  ctx.fillStyle = g;
  ctx.fillText(text, W / 2, 40);
  ctx.font = 'bold 8px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('BEACH VOLLEYBALL  ·  SANTA MONICA', W / 2, 52);
  ctx.restore();
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
  sky(ctx);
  sun(ctx);
  hills(ctx);
  skyline(ctx);
  ocean(ctx);
  pier(ctx);
  sand(ctx);
  palm(ctx, 26, 238, 150, 30, 1);
  palm(ctx, 456, 240, 138, 28, -1);
  banner(ctx);
}

// ───────── 움직이는 것들 ─────────

export function drawNet(ctx: CanvasRenderingContext2D) {
  const top = NET_TOP;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(NET_X - 9, top + 4, 18, GROUND - top - 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.8;
  for (let y = top + 6; y < GROUND; y += 8) {
    ctx.beginPath();
    ctx.moveTo(NET_X - 9, y);
    ctx.lineTo(NET_X + 9, y);
    ctx.stroke();
  }
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(NET_X + i * 8, top + 4);
    ctx.lineTo(NET_X + i * 8, GROUND);
    ctx.stroke();
  }
  // 기둥
  ctx.fillStyle = '#f4f1ea';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(NET_X - NET_HALF - 1, top - 4, NET_HALF * 2 + 2, GROUND - top + 4, 2);
  ctx.fill();
  ctx.stroke();
  // 위쪽 흰 띠
  ctx.fillStyle = '#fff';
  ctx.fillRect(NET_X - 10, top - 1, 20, 6);
  ctx.strokeRect(NET_X - 10, top - 1, 20, 6);
  ctx.restore();
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, r: number, h: number) {
  const k = Math.max(0.35, 1 - h / 260);
  ctx.save();
  ctx.fillStyle = `rgba(60,30,10,${0.28 * k})`;
  ctx.beginPath();
  ctx.ellipse(x, GROUND + 3, r * k, 4.5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface Look {
  body: [string, string];
  leaf: string;
  cheek: string;
}
export const LOOK_1P: Look = { body: ['#4C78F5', '#2B50E6'], leaf: '#4FB86E', cheek: '#ff8fa3' };
export const LOOK_2P: Look = { body: ['#ffb057', '#f07a1e'], leaf: '#d6e04a', cheek: '#ff6f91' };

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, side: 0 | 1, look: Look, ball: Ball, t: number) {
  const dir = side === 0 ? 1 : -1;
  const airborne = p.y < GROUND - PR - 2;
  // 점프 중엔 길쭉하게, 서 있을 땐 숨 쉬듯 살짝
  const stretch = airborne ? 1 + Math.min(0.1, Math.abs(p.vy) * 0.012) : 1 + Math.sin(t * 0.18 + side) * 0.015;
  const sx = 1 / Math.sqrt(stretch);
  const sy = stretch;
  ctx.save();
  ctx.translate(p.x, p.y);

  // 강타 팔 (공 쪽으로 뻗는다)
  if (p.spikeT > 0 || p.hitT > 0) {
    ctx.save();
    ctx.rotate(p.spikeT > 0 ? -0.9 * dir : -0.2 * dir);
    ctx.fillStyle = look.body[1];
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(dir * PR * 0.95, -PR * 0.25, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.scale(sx, sy);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2;
  // 발
  ctx.fillStyle = look.body[1];
  for (const fx of [-11, 11]) {
    ctx.beginPath();
    ctx.ellipse(fx, PR - 2, 9, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 몸
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, PR + 4);
  g.addColorStop(0, look.body[0]);
  g.addColorStop(1, look.body[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, PR, PR - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 새싹
  const sway = Math.max(-0.5, Math.min(0.5, -p.vx * 0.1)) + (airborne ? -p.vy * 0.03 : 0);
  ctx.save();
  ctx.translate(0, -PR + 2);
  ctx.rotate(sway * 0.5);
  ctx.fillStyle = look.leaf;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-1, -9, 2, -14);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(1, -12);
    ctx.quadraticCurveTo(s * 12, -22, s * 15, -10);
    ctx.quadraticCurveTo(s * 7, -9, 1, -12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // 눈 (공을 따라본다)
  const ang = Math.atan2(ball.y - p.y, ball.x - p.x);
  const ox = Math.cos(ang) * 2.6;
  const oy = Math.sin(ang) * 2.6;
  for (const ex of [-9, 9]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, -6, 6.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(ex + ox, -6 + oy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 볼
  ctx.fillStyle = look.cheek;
  ctx.globalAlpha = 0.6;
  for (const cx of [-17, 17]) {
    ctx.beginPath();
    ctx.ellipse(cx, 6, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 입
  ctx.beginPath();
  if (p.spikeT > 0 || p.hitT > 0) {
    ctx.fillStyle = '#7a1f2e';
    ctx.ellipse(0, 10, 4.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(0, 6, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
  // 스파이크 직후: 불꽃 꼬리와 빛무리
  if (b.power > 0) {
    ctx.save();
    const a = Math.min(1, b.power / 30);
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const ux = b.vx / sp;
    const uy = b.vy / sp;
    const glow = ctx.createRadialGradient(b.x, b.y, BR * 0.4, b.x, b.y, BR * 3);
    glow.addColorStop(0, `rgba(255,200,80,${0.75 * a})`);
    glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BR * 3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 1; i <= 9; i++) {
      const k = i / 9;
      ctx.fillStyle = `rgba(${255},${Math.round(210 - 130 * k)},${Math.round(70 - 50 * k)},${0.6 * a * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(b.x - ux * i * 8, b.y - uy * i * 8, BR * (1.05 - k * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    // 속도선
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const off of [-9, 0, 9]) {
      const ox = -uy * off;
      const oy = ux * off;
      ctx.beginPath();
      ctx.moveTo(b.x + ox - ux * 22, b.y + oy - uy * 22);
      ctx.lineTo(b.x + ox - ux * 52, b.y + oy - uy * 52);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.spin);
  ctx.beginPath();
  ctx.arc(0, 0, BR, 0, Math.PI * 2);
  ctx.fillStyle = '#fdfaf0';
  ctx.fill();
  ctx.clip();
  // 비치발리볼 조각 무늬 (노랑·파랑)
  ctx.fillStyle = '#f2d80e';
  ctx.beginPath();
  ctx.moveTo(-BR, -3);
  ctx.quadraticCurveTo(0, -12, BR, -3);
  ctx.lineTo(BR, 3);
  ctx.quadraticCurveTo(0, -5, -BR, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2B50E6';
  ctx.beginPath();
  ctx.moveTo(-BR, 6);
  ctx.quadraticCurveTo(0, -2, BR, 6);
  ctx.lineTo(BR, 12);
  ctx.quadraticCurveTo(0, 4, -BR, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.strokeStyle = b.power > 0 ? '#ff5a1f' : NAVY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, BR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 스파이크가 맞은 순간의 충격 효과 (번쩍임, 퍼지는 고리, 방사선, SPIKE! 글씨)
export interface SpikeFx {
  x: number;
  y: number;
  age: number;
}
export const SPIKE_FX_LIFE = 30;

export function drawSpikeFx(ctx: CanvasRenderingContext2D, fx: SpikeFx) {
  const a = fx.age / SPIKE_FX_LIFE;
  const fade = 1 - a;
  ctx.save();
  ctx.translate(fx.x, fx.y);
  if (fx.age < 6) {
    const r = 40 * (1 - fx.age / 8);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,236,140,${fade})`;
  ctx.lineWidth = 7 * fade + 1;
  ctx.beginPath();
  ctx.arc(0, 0, 12 + a * 62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${fade * 0.9})`;
  ctx.lineWidth = 3 * fade + 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, 6 + a * 36, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    const r0 = 16 + a * 26;
    const r1 = 30 + a * 58;
    ctx.strokeStyle = i % 2 ? `rgba(255,120,50,${fade})` : `rgba(255,214,70,${fade})`;
    ctx.lineWidth = 3.4 * fade + 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.stroke();
  }
  // SPIKE! (처음엔 확 커졌다가 떠오르며 사라진다)
  const pop = fx.age < 7 ? 0.7 + fx.age * 0.09 : 1.33 - Math.min(0.33, (fx.age - 7) * 0.02);
  ctx.globalAlpha = Math.min(1, fade * 1.6);
  ctx.font = '900 22px "Arial Black", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.translate(0, -34 - a * 22);
  ctx.scale(pop, pop);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#7a1f2e';
  ctx.strokeText('SPIKE!', 0, 0);
  ctx.fillStyle = '#ffe36b';
  ctx.fillText('SPIKE!', 0, 0);
  ctx.restore();
}
