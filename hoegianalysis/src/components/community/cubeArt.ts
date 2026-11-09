import type { FaceArt, FaceColor } from './sections';

// 큐브 면 스티커 색과 그 위 픽셀 그림 색
export const FACE_COLORS: Record<FaceColor, { bg: string; fg: string }> = {
  yellow: { bg: '#F2D80E', fg: '#000000' },
  blue: { bg: '#4C78F5', fg: '#ffffff' },
  white: { bg: '#ffffff', fg: '#2B50E6' },
};

export const CUBE_BODY = '#2B50E6';

// 12×12 픽셀 그림. 3×3 스티커에 4×4칸씩 나뉘어 들어간다 ('#' = 칠함)
const PIXELS: Record<Exclude<FaceArt, 'nupjuk'>, string[]> = {
  megaphone: [
    '............',
    '..........#.',
    '........###.',
    '......#####.',
    '.##########.',
    '.##########.',
    '.##########.',
    '.##########.',
    '......#####.',
    '..##....###.',
    '..##......#.',
    '............',
  ],
  calendar: [
    '............',
    '..#.....#...',
    '.##########.',
    '.##########.',
    '.#........#.',
    '.#.##.##..#.',
    '.#........#.',
    '.#.##.##..#.',
    '.#........#.',
    '.##########.',
    '............',
    '............',
  ],
  pencil: [
    '............',
    '.........##.',
    '........####',
    '.......####.',
    '......####..',
    '.....####...',
    '....####....',
    '...####.....',
    '..####......',
    '..###.......',
    '..#.........',
    '............',
  ],
  pin: [
    '............',
    '....####....',
    '...######...',
    '..###..###..',
    '..##....##..',
    '..###..###..',
    '...######...',
    '...######...',
    '....####....',
    '.....##.....',
    '............',
    '............',
  ],
  grade: [
    '............',
    '............',
    '...##.......',
    '..####......',
    '.##..##..#..',
    '.##..##.###.',
    '.######..#..',
    '.##..##.....',
    '.##..##.....',
    '.##..##.....',
    '............',
    '............',
  ],
};

function pixelSvgUrl(rows: string[], color: string): string {
  const rects = rows
    .flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : '')))
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges" fill="${color}">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// 면 전체에 걸칠 그림 (CSS background-image 값)
export function faceArtUrl(art: FaceArt, color: FaceColor): string {
  if (art === 'nupjuk') return 'url("/hoegilab/nupjuk-face.png")';
  return pixelSvgUrl(PIXELS[art], FACE_COLORS[color].fg);
}
