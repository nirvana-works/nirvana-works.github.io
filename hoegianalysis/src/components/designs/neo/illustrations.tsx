// 시안 01 그림: 원본 포스터의 손그림 만화 느낌을 SVG로 직접 그린다 (남의 그림을 쓰지 않는다)
// 굵은 먹선 + 원색 + 망점 그늘 + 속도선·먼지 구름
import { useId } from "react";
import { nb } from "./tokens";

const S = {
  stroke: "var(--nb-ink)",
  strokeWidth: 4,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

// 망점 무늬 (그림 안 그늘에 쓴다)
function Dots({
  id,
  gap = 7,
  r = 1.5,
}: {
  id: string;
  gap?: number;
  r?: number;
}) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
      <circle
        cx={gap / 2}
        cy={gap / 2}
        r={r}
        fill="var(--nb-ink)"
        opacity={0.55}
      />
    </pattern>
  );
}

// 먼지 구름 한 덩이 (동그라미 여러 개를 겹친다)
function Puff({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[
        [0, 0, 16],
        [18, -8, 14],
        [32, 4, 13],
        [14, 10, 13],
      ].map(([cx, cy, r], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--nb-paper)"
          {...S}
          strokeWidth={3.5}
        />
      ))}
    </g>
  );
}

// 신나게 달리는 야시장 푸드트럭. 운전석의 웃는 친구, 지붕 위 간판, 꼬치 연기
export function FoodTruck({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 420 280"
      className={className}
      aria-label="웃는 친구가 모는 야시장 푸드트럭 그림"
      role="img"
    >
      <defs>
        <Dots id={`d${id}`} />
      </defs>
      {/* 속도선 */}
      {[70, 100, 130].map((y, i) => (
        <path
          key={y}
          d={`M${330 + i * 8} ${y} H${405 - i * 6}`}
          {...S}
          strokeWidth={4}
        />
      ))}
      {/* 뒤 먼지 */}
      <Puff x={330} y={218} s={1.2} />
      <Puff x={362} y={190} s={0.9} />
      <Puff x={300} y={240} s={0.8} />

      <g transform="rotate(-5 200 160)">
        {/* 지붕 간판 */}
        <rect
          x={120}
          y={18}
          width={150}
          height={40}
          rx={10}
          fill={nb("yellow")}
          {...S}
        />
        <text
          x={195}
          y={46}
          textAnchor="middle"
          className="font-nbDisplay"
          fontSize={22}
          fill="var(--nb-ink)"
        >
          YUM YUM
        </text>
        <path d="M150 58 V74 M240 58 V74" {...S} />
        {/* 몸통 */}
        <path
          d="M40 150 Q40 80 110 76 H300 Q330 76 332 110 V212 H40 Z"
          fill="var(--nb-paper)"
          {...S}
        />
        {/* 아래 띠 */}
        <path d="M40 168 H332 V212 H40 Z" fill={nb("orange")} {...S} />
        <path d="M40 168 H332 V212 H40 Z" fill={`url(#d${id})`} />
        {/* 차양 */}
        <path d="M150 92 H322 L312 122 H160 Z" fill={nb("pink")} {...S} />
        {[172, 200, 228, 256, 284].map((x) => (
          <path key={x} d={`M${x} 92 L${x - 4} 122`} {...S} strokeWidth={3} />
        ))}
        <path
          d="M160 122 Q167 132 174 122 Q181 132 188 122 Q195 132 202 122 Q209 132 216 122 Q223 132 230 122 Q237 132 244 122 Q251 132 258 122 Q265 132 272 122 Q279 132 286 122 Q293 132 300 122 Q307 132 312 122"
          fill={nb("pink")}
          {...S}
          strokeWidth={3}
        />
        {/* 판매 창 + 꼬치 */}
        <rect
          x={168}
          y={130}
          width={140}
          height={34}
          rx={6}
          fill={nb("teal")}
          {...S}
        />
        <path d="M168 130 H308 V164 H168 Z" fill={`url(#d${id})`} />
        {[190, 222, 254, 286].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 156 V118`} {...S} strokeWidth={3} />
            <circle
              cx={x}
              cy={128}
              r={6}
              fill={nb(["red", "yellow", "red", "pink"][i] as "red")}
              {...S}
              strokeWidth={3}
            />
            <circle
              cx={x}
              cy={141}
              r={6}
              fill={nb(["yellow", "red", "pink", "yellow"][i] as "red")}
              {...S}
              strokeWidth={3}
            />
          </g>
        ))}
        {/* 운전석 창 */}
        <path d="M58 140 Q60 96 112 92 H136 V140 Z" fill={nb("sky")} {...S} />
        {/* 운전하는 친구: 둥근 얼굴, 큰 웃음 */}
        <circle cx={100} cy={120} r={20} fill={nb("yellow")} {...S} />
        <ellipse cx={93} cy={115} rx={2.6} ry={4} fill="var(--nb-ink)" />
        <ellipse cx={107} cy={115} rx={2.6} ry={4} fill="var(--nb-ink)" />
        <path d="M89 124 Q100 136 111 124 Z" fill="var(--nb-ink)" />
        <path d="M80 104 Q100 88 120 104" fill="none" {...S} strokeWidth={5} />
        {/* 헤드라이트 + 범퍼 */}
        <circle cx={44} cy={180} r={9} fill={nb("yellow")} {...S} />
        <rect
          x={30}
          y={200}
          width={40}
          height={14}
          rx={6}
          fill="var(--nb-paper)"
          {...S}
        />
        {/* 별 마크 */}
        <path
          d="M110 178 l5 10 11 1 -8 7 3 11 -11 -6 -10 6 3 -11 -8 -7 11 -1 z"
          fill={nb("red")}
          {...S}
          strokeWidth={3}
        />
        {/* 바퀴 */}
        {[100, 272].map((x) => (
          <g key={x}>
            <circle cx={x} cy={214} r={28} fill="var(--nb-ink)" />
            <circle
              cx={x}
              cy={214}
              r={12}
              fill="var(--nb-paper)"
              {...S}
              strokeWidth={3}
            />
          </g>
        ))}
      </g>
      {/* 꼬치 연기 */}
      <path
        d="M210 14 q-10 -10 0 -20 M232 16 q-10 -10 0 -20"
        fill="none"
        {...S}
        strokeWidth={3}
        transform="translate(0 6)"
      />
    </svg>
  );
}

// 꼬치를 들고 걸어가는 고양이 상인 (원본의 걷는 두 친구 자리)
export function SkewerCat({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 220 240"
      className={className}
      aria-label="꼬치를 들고 걷는 고양이 그림"
      role="img"
    >
      <defs>
        <Dots id={`c${id}`} gap={6} r={1.2} />
      </defs>
      {/* 다리 + 운동화 */}
      <path d="M92 176 L80 214" {...S} strokeWidth={9} />
      <path d="M126 176 L142 210" {...S} strokeWidth={9} />
      <path
        d="M58 214 Q60 200 82 204 L96 210 Q98 222 86 224 H62 Q54 222 58 214 Z"
        fill="var(--nb-paper)"
        {...S}
        strokeWidth={3.5}
      />
      <path
        d="M130 210 Q134 198 152 202 L168 208 Q170 220 158 222 H134 Q126 220 130 210 Z"
        fill="var(--nb-paper)"
        {...S}
        strokeWidth={3.5}
      />
      {/* 후드티 몸통 */}
      <path
        d="M70 120 Q70 100 110 98 Q150 100 150 120 L156 182 H64 Z"
        fill={nb("teal")}
        {...S}
      />
      <path d="M70 150 Q110 160 154 150 L156 182 H64 Z" fill={`url(#c${id})`} />
      <path d="M96 140 H124" {...S} strokeWidth={3} />
      {/* 꼬치 든 팔 */}
      <path d="M146 126 Q170 130 176 108" fill="none" {...S} strokeWidth={10} />
      <path
        d="M146 126 Q170 130 176 108"
        fill="none"
        stroke={nb("teal")}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle
        cx={177}
        cy={104}
        r={8}
        fill="var(--nb-paper)"
        {...S}
        strokeWidth={3}
      />
      <path d="M178 100 L196 30" {...S} strokeWidth={3} />
      {[46, 64, 82].map((y, i) => (
        <circle
          key={y}
          cx={196 - (82 - y) * 0.26 - 2}
          cy={y}
          r={9}
          fill={nb(["red", "yellow", "pink"][i] as "red")}
          {...S}
          strokeWidth={3}
        />
      ))}
      {/* 다른 팔 */}
      <path d="M74 128 Q56 148 66 166" fill="none" {...S} strokeWidth={10} />
      <path
        d="M74 128 Q56 148 66 166"
        fill="none"
        stroke={nb("teal")}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* 머리: 귀 + 얼굴 */}
      <path d="M68 44 L74 6 L98 32 Z" fill="var(--nb-paper)" {...S} />
      <path d="M150 44 L146 6 L122 30 Z" fill="var(--nb-paper)" {...S} />
      <path
        d="M76 22 L80 34 L88 30 Z M142 22 L138 34 L130 30 Z"
        fill={nb("pink")}
      />
      <ellipse cx={110} cy={64} rx={48} ry={40} fill="var(--nb-paper)" {...S} />
      {/* 선글라스 */}
      <path d="M74 56 H146" {...S} strokeWidth={3.5} />
      <rect x={78} y={52} width={28} height={18} rx={8} fill="var(--nb-ink)" />
      <rect x={114} y={52} width={28} height={18} rx={8} fill="var(--nb-ink)" />
      <path
        d="M84 57 L92 57"
        stroke="var(--nb-paper)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M120 57 L128 57"
        stroke="var(--nb-paper)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* 코·입·수염 */}
      <path
        d="M106 78 L114 78 L110 83 Z"
        fill={nb("pink")}
        {...S}
        strokeWidth={2.5}
      />
      <path
        d="M98 86 Q104 94 110 86 Q116 94 122 86"
        fill="none"
        {...S}
        strokeWidth={3}
      />
      <path
        d="M60 78 L82 80 M60 88 L82 86 M160 78 L138 80 M160 88 L138 86"
        {...S}
        strokeWidth={2.5}
      />
      {/* 걷는 땅 풀 */}
      <path
        d="M40 228 l6 -12 4 12 M176 230 l5 -10 4 10"
        fill="none"
        {...S}
        strokeWidth={3}
      />
    </svg>
  );
}
