// 생일 축하 노래(Happy Birthday to You, 퍼블릭 도메인) 멜로디를 브라우저에서 직접 합성해 연주한다.
// 소리 파일 없이 Web Audio로 오르골처럼. 반환값을 부르면 멈춘다

// [음 높이(MIDI), 박자] — 3/4박자
const MELODY: [number, number][] = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
];
const BEAT = 0.42; // 초

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function playBirthdaySong(ctx: AudioContext): () => void {
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  let t = ctx.currentTime + 0.08;
  for (const [note, beats] of MELODY) {
    const dur = beats * BEAT;
    // 기본음(사인) + 한 옥타브 위 배음(삼각파)을 짧게 울리고 사라지게
    for (const [type, mult, level] of [
      ['sine', 1, 1],
      ['triangle', 2, 0.18],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq(note) * mult;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + Math.max(dur, 0.35) * 0.95);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + Math.max(dur, 0.35));
    }
    t += dur;
  }

  return () => {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  };
}

export const SONG_SECONDS = MELODY.reduce((sum, [, beats]) => sum + beats, 0) * BEAT;
