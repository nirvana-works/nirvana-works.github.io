// 카메라 화면에서 "카드나 핸드폰처럼 생긴 직사각형"을 찾는다. 무엇인지 구분하지 않고 모양만 본다.
// 학습 모델 없이 동작한다: 밝기로 배경과 물체를 가르고(두 방향 모두), 덩어리의 기울어진 직사각형 채움 정도와 가로세로 비율을 본다.

export interface Found {
  cx: number; // 중심 (0~1, 분석한 화면 기준)
  cy: number;
  w: number; // 긴 변 / 짧은 변 길이 (0~1, 화면 가로 기준)
  h: number;
  angle: number; // 긴 변 방향 (라디안)
  fill: number; // 직사각형을 얼마나 채우는지 (0~1)
  score: number;
}

// 큰 카드(약 1.59:1)부터 핸드폰(약 2:1)까지 받아들인다
const MIN_ASPECT = 1.25;
const MAX_ASPECT = 2.5;
const MIN_FILL = 0.74;

function otsu(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

// 3x3 팽창 후 침식 (작은 구멍과 글자·무늬 때문에 덩어리가 쪼개지는 것을 메운다)
function close(mask: Uint8Array, w: number, h: number, rounds: number): Uint8Array {
  let cur = mask;
  const step = (src: Uint8Array, grow: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = grow ? 0 : 1;
        for (let dy = -1; dy <= 1 && (grow ? !hit : hit); dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) {
            if (!grow) hit = 0;
            continue;
          }
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) {
              if (!grow) hit = 0;
              continue;
            }
            const v = src[yy * w + xx];
            if (grow && v) {
              hit = 1;
              break;
            }
            if (!grow && !v) {
              hit = 0;
              break;
            }
          }
        }
        out[y * w + x] = hit ? 1 : 0;
      }
    }
    return out;
  };
  for (let r = 0; r < rounds; r++) cur = step(cur, true);
  for (let r = 0; r < rounds; r++) cur = step(cur, false);
  return cur;
}

function best(mask: Uint8Array, w: number, h: number): Found | null {
  const label = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  let next = 1;
  let result: Found | null = null;
  const frameArea = w * h;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    // 덩어리 하나 모으기
    let sp = 0;
    stack[sp++] = start;
    label[start] = next;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    const pts: number[] = [];
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      pts.push(p);
      area++;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !label[p - 1]) (label[p - 1] = next), (stack[sp++] = p - 1);
      if (x < w - 1 && mask[p + 1] && !label[p + 1]) (label[p + 1] = next), (stack[sp++] = p + 1);
      if (y > 0 && mask[p - w] && !label[p - w]) (label[p - w] = next), (stack[sp++] = p - w);
      if (y < h - 1 && mask[p + w] && !label[p + w]) (label[p + w] = next), (stack[sp++] = p + w);
    }
    next++;

    const frac = area / frameArea;
    if (frac < 0.025 || frac > 0.7) continue;
    // 화면 가장자리에 크게 걸친 덩어리는 배경이나 테이블일 가능성이 높다
    const touches = (minX === 0 ? 1 : 0) + (maxX === w - 1 ? 1 : 0) + (minY === 0 ? 1 : 0) + (maxY === h - 1 ? 1 : 0);
    if (touches >= 2) continue;

    // 주축 방향 구하기
    const mx = sx / area;
    const my = sy / area;
    const cxx = sxx / area - mx * mx;
    const cyy = syy / area - my * my;
    const cxy = sxy / area - mx * my;
    const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of pts) {
      const x = (p % w) - mx;
      const y = Math.floor(p / w) - my;
      const u = x * c + y * s;
      const v = -x * s + y * c;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const lu = maxU - minU + 1;
    const lv = maxV - minV + 1;
    const long = Math.max(lu, lv);
    const short = Math.min(lu, lv);
    const aspect = long / short;
    const fill = area / (lu * lv);
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT || fill < MIN_FILL) continue;
    if (short < Math.min(w, h) * 0.12) continue;

    // 점수: 직사각형에 가까울수록, 카드(1.59)나 폰(2.0) 비율에 가까울수록, 적당히 클수록 높게
    const aspectScore = Math.max(1 - Math.abs(aspect - 1.59) / 1.2, 1 - Math.abs(aspect - 2.0) / 1.2);
    const sizeScore = frac > 0.45 ? 0.6 : frac < 0.05 ? 0.7 : 1;
    const score = fill * Math.max(0.2, aspectScore) * sizeScore;
    // 화면 위 중심과 긴 변 방향 (u가 긴 변이면 theta, 아니면 90도 돌린다)
    const uLong = lu >= lv;
    const angle = uLong ? theta : theta + Math.PI / 2;
    const ccx = mx + ((maxU + minU) / 2) * c - ((maxV + minV) / 2) * s;
    const ccy = my + ((maxU + minU) / 2) * s + ((maxV + minV) / 2) * c;
    if (!result || score > result.score) {
      result = { cx: ccx / w, cy: ccy / h, w: long / w, h: short / w, angle, fill, score };
    }
  }
  return result;
}

/** RGBA 이미지 데이터에서 카드나 핸드폰 모양을 하나 찾는다 (가장 그럴듯한 것). 없으면 null */
export function detectCardLike(data: Uint8ClampedArray, w: number, h: number): Found | null {
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  const thr = otsu(gray);
  const dark = new Uint8Array(w * h);
  const bright = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] <= thr) dark[i] = 1;
    else bright[i] = 1;
  }
  const a = best(close(dark, w, h, 2), w, h);
  const b = best(close(bright, w, h, 2), w, h);
  if (a && b) return a.score >= b.score ? a : b;
  return a ?? b;
}
