<div align="center">

# 🦖 DINO DASH 3D ☄️

### *A Prehistoric Survival Runner — Built for the Browser*

[![Live Demo](https://img.shields.io/badge/🎮%20Play%20Live-dino2game.netlify.app-brightgreen?style=for-the-badge)](https://dino2game.netlify.app/)
[![GitHub](https://img.shields.io/badge/GitHub-naveenkumarr24cs--a11y-black?style=for-the-badge&logo=github)](https://github.com/naveenkumarr24cs-a11y/DINOGAME)
[![Netlify Status](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify)](https://dino2game.netlify.app/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2021-F7DF1E?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> *"The asteroids are falling, the volcanoes are erupting, and the last survivor must run!"*

</div>

---

## 🎮 About the Game

**Dino Dash 3D** is a fully browser-based, 3D endless runner game built entirely from scratch using **Three.js (WebGL)** and **Vanilla JavaScript** — no game engines, no external frameworks. 

You control a prehistoric dinosaur racing through dangerous era-themed levels, dodging enemies and obstacles as the world ends around you. With cinematic loading screens, procedurally generated environments, real-time animated 3D models, and a synthesized audio engine — every detail is hand-crafted for an immersive experience.

**Supports both Mobile 📱 and Desktop 💻 — play anywhere, instantly!**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🦖 **Character Selection** | Choose from 5 unique dinosaurs, each with different Speed, Jump, and Armor stats |
| 🌋 **3 Unique Levels** | Prehistoric Plains → Volcanic Badlands → Ruins at Night |
| 🎬 **Cinematic Intro** | Staggered meteor streaks, letter-by-letter title reveal, and wipe transitions |
| 🔊 **Procedural Audio** | All sounds synthesized via Web Audio API — no audio files needed |
| 📱 **Mobile Controls** | Custom on-screen touch buttons for Jump and Duck |
| ⌨️ **Desktop Controls** | Keyboard: Space/W (Jump), S (Duck), P/ESC (Pause) |
| 🏆 **Leaderboard** | Local high score tracking via `localStorage` |
| 🌌 **Parallax Environment** | Scrolling mountains, trees, clouds, and star fields |
| 💡 **Dynamic Lighting** | Directional sun light, ambient fill, and per-level point lights |
| 📊 **Live HUD** | SVG Speed Gauge, Score Multiplier, Hearts, Level Progress Bar |
| ⏸️ **Pause System** | Full pause/resume with on-screen and keyboard controls |
| ⚙️ **Settings** | Toggle sound/music and switch between Low/High graphics quality |

---

## 🕹️ How to Play

| Control | Action |
|---|---|
| `Space` / `W` / `↑` | **Jump** (press again mid-air for Double Jump) |
| `S` / `↓` | **Duck / Crouch Slide** |
| `P` / `ESC` | **Pause / Resume** |
| `Mobile ↑` | **Jump** (on-screen button) |
| `Mobile ↓` | **Duck** (on-screen button) |

> Dodge running dinosaurs, swooping pterodactyls, and crumbling ground tiles. Survive all 3 levels to win!

---

## 🏗️ Tech Stack

```
Frontend       →  Vanilla JavaScript (ES Modules), HTML5, CSS3
3D Engine      →  Three.js r128 (WebGL)
Model Loading  →  GLTFLoader + SkeletonUtils (animated GLB models)
Audio          →  Web Audio API (procedural synthesis — zero audio files)
Build Tool     →  Vite 6
Deployment     →  Netlify (CI/CD via GitHub auto-deploy)
Version Control→  Git + GitHub
```

---

## 📁 Project Structure

```
dino-dash-3d/
│
├── index.html              # Game shell — HUD, screens, import maps
├── style.css               # Full vanilla CSS design system (45KB)
│
├── js/
│   ├── main.js             # Entry point — cinematic intro + loader pipeline
│   ├── game.js             # Core game loop, physics, collision detection
│   ├── player.js           # Player controller — jump, duck, death
│   ├── enemy.js            # Enemy spawner — dinosaurs, pterodactyls
│   ├── map.js              # Procedural environment, parallax, lighting
│   ├── loader.js           # Asset preloader — GLTFLoader + SkeletonUtils
│   ├── ui.js               # UI Manager — screen transitions, HUD updates
│   ├── audio.js            # Full audio system — music, SFX playback
│   ├── audio-synth.js      # Web Audio API procedural sound synthesizer
│   └── constants.js        # Game config — levels, dinos, enemies, speeds
│
├── vite.config.ts          # Vite build config with React + Tailwind plugins
├── netlify.toml            # Netlify build + SPA redirect rules
└── package.json            # Project dependencies and scripts
```

---

## 🚀 Run Locally

**Prerequisites:** Node.js (v18+)

```bash
# 1. Clone the repository
git clone https://github.com/naveenkumarr24cs-a11y/DINOGAME.git
cd DINOGAME

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

### Build for Production
```bash
npm run build
# Output is in the /dist folder
```

---

## 🌐 Live Demo

**👉 Play now at: [https://dino2game.netlify.app/](https://dino2game.netlify.app/)**

No installation. No login. Just open and play instantly in your browser on any device!

---

## 🐛 Known Fixes Applied

| Bug | Root Cause | Fix Applied |
|---|---|---|
| `G.clone is not a function` | `SkeletonUtils` was imported as namespace (`import * as`) instead of class (`import { SkeletonUtils }`) in Three.js r128 | Changed to `import { SkeletonUtils }` |
| `flatShading` material warnings | `MeshLambertMaterial` does not support `flatShading` | Replaced with `MeshPhongMaterial` |

---

## 📸 Screenshots

> 🎮 Cinematic Intro → Main Menu → Character Selection → Gameplay → Game Over

*(Play the live demo for the full experience!)*

---

## 🙌 Developer

**Naveen Kumar**
- 🔗 GitHub: [@naveenkumarr24cs-a11y](https://github.com/naveenkumarr24cs-a11y)
- 🌐 Live: [dino2game.netlify.app](https://dino2game.netlify.app/)

---

<div align="center">

**⭐ If you like this project, please star the repository! ⭐**

*Built with ❤️ using Three.js and vanilla JavaScript*

</div>
