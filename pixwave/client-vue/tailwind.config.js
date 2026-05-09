/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── 字体 ──────────────────────────────────────────
      fontFamily: {
        pixel: ['"Press Start 2P"', '"SimHei"', 'monospace'],
        mono: ['"VT323"', '"Courier New"', '"SimSun"', 'monospace'],
        body: ['"Microsoft YaHei"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },

      // ── 色彩 ──────────────────────────────────────────
      colors: {
        // 复古终端绿 + 赛博黄
        acid: {
          DEFAULT: '#00FF41',
          dim: '#00CC34',
          glow: '#39FF14',
        },
        cyber: {
          DEFAULT: '#FFD700',
          dim: '#CCA800',
          glow: '#FFED4A',
        },
        // 深色背景层级
        void: {
          DEFAULT: '#0A0A0A',
          card: '#111111',
          elevated: '#1A1A1A',
          border: '#2A2A2A',
        },
      },

      // ── 硬阴影（像素风） ───────────────────────────────
      boxShadow: {
        'pixel-acid': '4px 4px 0px #00FF41',
        'pixel-cyber': '4px 4px 0px #FFD700',
        'pixel-dark': '4px 4px 0px #1A1A1A',
        'pixel-sm-acid': '2px 2px 0px #00FF41',
        'pixel-sm-cyber': '2px 2px 0px #FFD700',
        'inset-pixel': 'inset 2px 2px 0px rgba(0,255,65,0.15)',
      },

      // ── 圆角（硬朗直角） ───────────────────────────────
      borderRadius: {
        none: '0px',
        pixel: '2px',
      },

      // ── 动画 ──────────────────────────────────────────
      animation: {
        'blink': 'blink 1s step-end infinite',
        'typewriter': 'typewriter 0.05s steps(1)',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
