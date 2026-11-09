/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#12142B",
        bgAlt: "#1B1E3D",
        neon: "#FFB347",
        stamp: "#E63946",
        cream: "#F5F0E6",
        // Hoegilab 커뮤니티 (루빅스 큐브 포스터 톤)
        lime: "#DDE5A6",
        cube: "#2B50E6",
        cubeDeep: "#1f3cb8",
        sticker: "#F2D80E",
        stickerBlue: "#4C78F5",
        ink: "#000000",
        inkMuted: "#4c5230",
        seal: "#c8322b",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        sign: ["var(--font-sign)", "sans-serif"],
        // 영문·숫자 전용 (한글은 sign으로 떨어진다)
        latin: ["var(--font-latin)", "var(--font-sign)", "sans-serif"],
        // 낙서 벽 손글씨
        pen: ["var(--font-pen)", "cursive"],
      },
    },
  },
  plugins: [],
}
