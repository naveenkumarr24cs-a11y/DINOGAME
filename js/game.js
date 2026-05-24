/**
 * Dino Dash 3D - Core Game Manager & Scene Loop
 */

import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { assetLoader } from './loader.js';
import { audioManager } from './audio.js';
import { mapBuilder } from './map.js';
import { uiManager } from './ui.js';
import { Player } from './player.js';
import { enemyManager } from './enemy.js';
import { audioSynth } from './audio-synth.js';

class GameManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;

    // Game lifecycle states
    this.states = {
      MENU: 'menu',
      PLAYING: 'playing',
      PAUSED: 'paused',
      COMPLETE: 'complete',
      OVER: 'over',
      VICTORY: 'victory',
      DYING: 'dying',
      CINEMATIC: 'cinematic'
    };
    this.currentState = this.states.MENU;
    this.dyingTimer = 0.0;

    // Active entities
    this.playerInstance = null;
    this.currentLevelNo = 1;
    this.currentSpeed = 10.0;
    this.score = 0;
    this.highScore = 0;
    
    // Time counters
    this.levelTimeRemaining = 120; // counting down
    this.scoreTimer = 0.0;
    this.enemiesPassedStreak = 0;
    this.totalDodgeCount = 0;
    this.scoreMultiplier = 1;

    // Carousel character viewer model
    this.carouselModel = null;
    this.carouselMixer = null;

    // Level 3 specials
    this.darknessTimer = 0.0;
    this.isPulsedDark = false;
    this.runes = [];
    this.runeSpawnTimer = 0.0;

    // Hit-effects
    this.shakeTimer = 0.0;
    this.shakeMagnitude = 0.15;
    this.originalCamPos = new THREE.Vector3(0.0, 1.2, 5.0);
    this.camTargetPos = new THREE.Vector3(0.0, 1.2, 5.0);
    this.camLerpSpeed = 5.0;
  }

  init() {
    // 1. Initialise WebGL Renderer
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.userData.time = 0; // custom shader clock helper
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.copy(this.originalCamPos);
    this.camera.lookAt(0.0, 0.5, 0.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = uiManager.graphicsQuality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // Responsive Canvas
    window.addEventListener('resize', () => this.handleResize());

    // 2. Load high scores persistence
    this.highScore = uiManager.highScoreRetrieved();

    // 3. Setup sub-elements
    mapBuilder.init(this.scene);
    enemyManager.init(this.scene);
    uiManager.init(this);

    // 4. Default to menu mode
    this.setupMenuDinoPreview(CONSTANTS.DINOS[0].id);

    // 5. Input key listener
    this.bindInputs();

    // First interaction ambient audio trigger
    const startAmbientOnKey = () => {
      if (this.currentState === this.states.MENU) {
        audioSynth.playMenuAmbient();
      }
      window.removeEventListener('click', startAmbientOnKey);
      window.removeEventListener('keydown', startAmbientOnKey);
      window.removeEventListener('touchstart', startAmbientOnKey);
    };
    window.addEventListener('click', startAmbientOnKey);
    window.addEventListener('keydown', startAmbientOnKey);
    window.addEventListener('touchstart', startAmbientOnKey);

    // 6. Enter Tick loop
    this.animate();
  }

  setupMenuDinoPreview(dinoId) {
    if (this.carouselModel) {
      this.scene.remove(this.carouselModel);
      this.carouselModel = null;
    }

    const { model, animations } = assetLoader.cloneModel(dinoId, 'dinos');
    this.carouselModel = model;
    
    // Position showcase spotlight preview scene
    this.carouselModel.position.set(0.0, -0.1, 0.0);
    if (dinoId === 'DINO_5') {
      this.carouselModel.rotation.set(0, -Math.PI / 4, 0); // Correctly show front 3/4 view of Dino 5
    } else {
      this.carouselModel.rotation.set(0, Math.PI - Math.PI / 4, 0); // Angled nicely towards 3/4 front view
    }
    this.scene.add(this.carouselModel);

    // Warm light on active dino front side
    if (mapBuilder.pointLight) {
      mapBuilder.pointLight.position.set(0.0, 2.0, 1.5);
    }

    this.carouselMixer = new THREE.AnimationMixer(this.carouselModel);
    
    // Play running / idle loop on main menu
    let run = assetLoader.getBestClip(animations, ['run', 'walk', 'idle']);
    if (dinoId === 'DINO_5') {
      const nietClip = animations.find(c => c.name.toLowerCase().includes('niet')) || animations[1];
      if (nietClip) {
        run = nietClip;
      }
    }
    if (run) {
      const act = this.carouselMixer.clipAction(run);
      act.play();
    }
  }

  carouselSelectionChanged(dinoId) {
    if (this.currentState === this.states.MENU) {
      this.setupMenuDinoPreview(dinoId);
    }
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Independent Pause toggler (works when playing or paused)
      if (key === 'p') {
        if (this.currentState === this.states.PLAYING) {
          this.pauseGame();
          return;
        } else if (this.currentState === this.states.PAUSED) {
          this.resumeGame();
          return;
        }
      }

      // Rest of keys are only active during active gameplay
      if (this.currentState !== this.states.PLAYING) return;

      if (key === ' ' || key === 'arrowup' || key === 'w') {
        if (this.playerInstance) this.playerInstance.jump();
      }
      if (key === 'arrowdown' || key === 's') {
        if (this.playerInstance) this.playerInstance.duck(true);
      }
      if (key === 'c') {
        this.triggerPassObstacle();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.currentState !== this.states.PLAYING) return;

      const key = e.key.toLowerCase();
      if (key === 'arrowdown' || key === 's') {
        if (this.playerInstance) this.playerInstance.duck(false);
      }
    });

    // Handle tab minimization or sudden focus changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentState === this.states.PLAYING) {
        this.pauseGame();
      }
    });

    // Touch gesture helpers for mobile swipe support
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.target.closest('#mobile-controls')) return; /* button handled it — skip swipe */
      if (this.currentState !== this.states.PLAYING) return;

      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;

      // Vertical swipe check (greater magnitude than horizontal)
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 30) {
        if (diffY < 0) {
          // Swipe up
          if (this.playerInstance) this.playerInstance.jump();
        } else {
          // Swipe down
          if (this.playerInstance) {
            this.playerInstance.duck(true);
            setTimeout(() => {
              this.playerInstance.duck(false);
            }, 600); // crouch release after swipe delay
          }
        }
      }
    }, { passive: true });
  }

  startGame(dinoId) {
    console.log("Starting Dino Dash Game with characters", dinoId);

    // Stop menu ambient drone
    audioSynth.stopMenuAmbient();

    // Play prehistoric launch horn roar
    audioSynth.playLaunchRoar();

    // Trigger visual launch cues
    const homeScreenEl = document.getElementById('home-screen');
    if (homeScreenEl) homeScreenEl.classList.add('launch-blur');
    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.classList.add('launch-scale');

    // 1. Terminate Menu Showcase Model
    if (this.carouselModel) {
      this.scene.remove(this.carouselModel);
      this.carouselModel = null;
    }

    // 2. Clear lingering elements
    enemyManager.clearAll();
    this.clearRunes();

    // 3. Instantiate Runner Player
    if (this.playerInstance) {
      this.playerInstance.destroy();
    }
    this.playerInstance = new Player(dinoId, this.scene);

    // Dynamic point light and snap camera to start position behind player
    if (mapBuilder.pointLight) {
      mapBuilder.pointLight.position.set(CONSTANTS.PLAYER_X, 2.5, 0.0);
    }

    // Pre-set camera to starting cinematic high position
    this.camera.position.set(CONSTANTS.PLAYER_X, 3.5, 12.0);
    this.camera.lookAt(CONSTANTS.PLAYER_X, 0.5, 0.0);

    // Reset parameters
    this.currentLevelNo = 1;
    this.score = 0;
    this.enemiesPassedStreak = 0;
    this.totalDodgeCount = 0;
    this.scoreMultiplier = 1;
    this.shakeTimer = 0.0;
    this.shakeMagnitude = 0.15;
    this.runeSpawnTimer = 0.0;
    this.passCharges = 3;
    const countEl = document.getElementById('pass-charges-count');
    if (countEl) countEl.textContent = `(${this.passCharges})`;

    this.loadLevel(this.currentLevelNo);

    // Trigger scale-punch HUD overlay digits countdown
    this.startCountdownTransition();

    // Set UI Screen — which kicks off stagger animations automatically
    uiManager.showScreen('hud');

    // Transition state enum to CINEMATIC instead of PLAYING
    this.currentState = this.states.CINEMATIC;
    this.cinematicTimeElapsed = 0.0;
  }

  startCountdownTransition() {
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    overlay.classList.remove('hidden');

    const spawnNum = (char, isDash = false) => {
      const numDiv = document.createElement('div');
      numDiv.className = `countdown-num ${isDash ? 'dash' : ''}`;
      numDiv.textContent = char;
      overlay.appendChild(numDiv);
      setTimeout(() => {
        numDiv.remove();
      }, 550);
    };

    // Stagger digits
    setTimeout(() => spawnNum("3"), 100);
    setTimeout(() => spawnNum("2"), 650);
    setTimeout(() => spawnNum("1"), 1200);
    setTimeout(() => spawnNum("DASH!", true), 1750);

    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 2350);
  }

  cinematicTick(deltaTime) {
    this.cinematicTimeElapsed += deltaTime;
    const duration = 1.8;
    const progress = Math.min(1.0, this.cinematicTimeElapsed / duration);
    
    // easeOutCubic: t => 1 - Math.pow(1 - t, 3)
    const t = 1 - Math.pow(1 - progress, 3);
    
    const px = this.playerInstance ? this.playerInstance.model.position.x : CONSTANTS.PLAYER_X;
    
    const startCamX = px;
    const startCamY = 3.5;
    const startCamZ = 12.0;
    
    const endCamX = px - 4.5;
    const endCamY = 2.5;
    const endCamZ = 7.5;
    
    const currentCamX = THREE.MathUtils.lerp(startCamX, endCamX, t);
    const currentCamY = THREE.MathUtils.lerp(startCamY, endCamY, t);
    const currentCamZ = THREE.MathUtils.lerp(startCamZ, endCamZ, t);
    
    this.camera.position.set(currentCamX, currentCamY, currentCamZ);
    this.camera.lookAt(px, 0.5 + (1 - t) * 0.5, 0.0);

    // Let environments animate slowly for natural liveliness
    mapBuilder.update(deltaTime, this.currentSpeed * 0.2, this.currentLevelNo);
    if (this.playerInstance) {
      this.playerInstance.update(deltaTime);
    }

    if (progress >= 1.0) {
      // Restore normal focus values on home elements for future restarts
      const homeScreenEl = document.getElementById('home-screen');
      if (homeScreenEl) homeScreenEl.classList.remove('launch-blur');
      const startBtn = document.getElementById('btn-start');
      if (startBtn) startBtn.classList.remove('launch-scale');

      // Pivot game loop to main gameplay
      this.currentState = this.states.PLAYING;
      this.clock.getDelta(); // flush
    }
  }

  loadLevel(levelNo) {
    this.currentLevelNo = levelNo;
    const config = CONSTANTS.LEVELS[levelNo];
    this.currentSpeed = config.startSpeed;
    this.levelTimeRemaining = config.duration;

    // Reset maps layouts parameters
    mapBuilder.setTheme(levelNo);

    // Play appropriate procedural drum loop
    audioManager.startMusic(levelNo);
  }

  startNextLevel() {
    this.clearRunes();
    const nextLvl = this.currentLevelNo + 1;
    if (CONSTANTS.LEVELS[nextLvl]) {
      uiManager.wipeTransition(() => {
        this.loadLevel(nextLvl);
        uiManager.showScreen('hud');
        this.currentState = this.states.PLAYING;
        this.clock.getDelta(); // flush delta
      });
    } else {
      // Beat level 3 => GAME BEATEN FULL VICTORY!
      this.handleGameVictory();
    }
  }

  restartGame() {
    if (this.playerInstance) {
      this.startGame(this.playerInstance.dinoId);
    } else {
      this.startGame(CONSTANTS.DINOS[0].id);
    }
  }

  pauseGame() {
    if (this.currentState !== this.states.PLAYING) return;
    this.currentState = this.states.PAUSED;
    audioManager.stopMusic();
    uiManager.showScreen('pause-screen');
  }

  resumeGame() {
    if (this.currentState !== this.states.PAUSED) return;
    this.currentState = this.states.PLAYING;
    audioManager.startMusic(this.currentLevelNo);
    this.clock.getDelta(); // Clear delta accumulation so we don't jump / skip on resume
    uiManager.showScreen('hud');
  }

  quitGame() {
    this.returnToHome();
    uiManager.showScreen('home-screen');
  }

  returnToHome() {
    this.currentState = this.states.MENU;
    audioManager.stopMusic();
    audioSynth.playMenuAmbient();
    
    if (this.playerInstance) {
      this.playerInstance.destroy();
      this.playerInstance = null;
    }
    enemyManager.clearAll();
    this.clearRunes();

    // Reset point light to center focus
    if (mapBuilder.pointLight) {
      mapBuilder.pointLight.position.set(0.0, 2.0, 1.5);
    }

    this.setupMenuDinoPreview(CONSTANTS.DINOS[uiManager.currentCarouselIdx].id);
    this.camera.position.copy(this.originalCamPos);
    this.camera.lookAt(0.0, 0.5, 0.0);

    // Reset Map to default sunny Level 1 theme
    mapBuilder.setTheme(1);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // cap frame spikes
    
    // Execute state ticks
    if (this.currentState === this.states.PLAYING) {
      this.scene.userData.time += deltaTime;
      this.playingTick(deltaTime);
    } else if (this.currentState === this.states.MENU) {
      this.scene.userData.time += deltaTime;
      this.menuTick(deltaTime);
    } else if (this.currentState === this.states.PAUSED) {
      // Game is paused: freeze update ticks and clock timers
    } else if (this.currentState === this.states.DYING) {
      const slowDeltaTime = deltaTime * 0.15; // 15% rate slow-motion death simulation
      this.scene.userData.time += slowDeltaTime;
      this.dyingTick(deltaTime, slowDeltaTime);
    } else if (this.currentState === this.states.CINEMATIC) {
      this.scene.userData.time += deltaTime;
      this.cinematicTick(deltaTime);
    }

    // Render WebGL
    this.renderFrame(deltaTime);
  }

  menuTick(deltaTime) {
    // Spin menu preview dino slowly
    if (this.carouselModel) {
      this.carouselModel.rotation.y += deltaTime * 0.4;

      // Keep spotlight styled relative to projected world space coordinates
      const ring = document.querySelector('.dino-spotlight-frame');
      if (ring) {
        const tempV = new THREE.Vector3(0, 0.35, 0); // focus point of model
        tempV.project(this.camera);
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-tempV.y * 0.5 + 0.5) * window.innerHeight;
        // Set styling on CSS element to position it perfectly over the WebGL model
        ring.style.position = 'fixed';
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        ring.style.transform = 'translate(-50%, -50%)';
      }
    }
    if (this.carouselMixer) {
      this.carouselMixer.update(deltaTime);
    }

    // Scroll map environment slowly
    mapBuilder.update(deltaTime, 1.5, 1);
  }

  playingTick(deltaTime) {
    const config = CONSTANTS.LEVELS[this.currentLevelNo];

    // Ramp speed gradually up to maximum speed over level progression
    const factor = Math.min(1.0, (config.duration - this.levelTimeRemaining) / config.duration);
    this.currentSpeed = THREE.MathUtils.lerp(config.startSpeed, config.maxSpeed, factor);

    // 1. Tick Level clock timer down
    this.levelTimeRemaining -= deltaTime;
    if (this.levelTimeRemaining <= 0) {
      this.levelTimeRemaining = 0;
      this.handleLevelCompleted();
      return;
    }

    // 2. Increment scores based on survival time (once every 10 frames approx)
    this.scoreTimer += deltaTime;
    if (this.scoreTimer >= 0.1) {
      this.scoreTimer = 0.0;
      this.score += 1 * this.scoreMultiplier;
    }

    // 3. Update active elements
    if (this.playerInstance) {
      this.playerInstance.update(deltaTime);
    }
    
    mapBuilder.update(deltaTime, this.currentSpeed, this.currentLevelNo);
    enemyManager.update(deltaTime, this.currentSpeed, this.currentLevelNo);

    // 4. Run Collisions checks
    this.checkCollisions();

    // 5. Level 3 specific features: Lights pulsate darkness and collectible Speed Runes
    if (this.currentLevelNo === 3) {
      this.handleLevelThreeMechanics(deltaTime);
    }

    // 6. Refresh HUD metrics
    const progressPcnt = 100 - Math.min(100, Math.max(0, (this.levelTimeRemaining / config.duration) * 100));
    uiManager.updateHUD(
      this.playerInstance ? this.playerInstance.lives : 0,
      this.score,
      this.highScore,
      this.currentLevelNo,
      this.currentSpeed,
      progressPcnt,
      this.scoreMultiplier
    );

    // Camera rig updating (lerps smoothly near player)
    if (this.playerInstance) {
      this.camTargetPos.set(this.playerInstance.model.position.x - 4.5, 2.5 + this.playerInstance.y * 0.1, 7.5);
    }
  }

  handleLevelThreeMechanics(deltaTime) {
    // Periodic Darkness pulses (every 20s dims light for 3 seconds)
    this.darknessTimer += deltaTime;
    const cycle = Math.floor(this.darknessTimer % 20);

    if (cycle >= 17) {
      if (!this.isPulsedDark) {
        this.isPulsedDark = true;
        // Fade directional light intensity down
        this.toggleLevel3Darkness(true);
      }
    } else {
      if (this.isPulsedDark) {
        this.isPulsedDark = false;
        this.toggleLevel3Darkness(false);
      }
    }

    // Spawn rotating runes periodically (Y = 1.0, Z = 0)
    this.runeSpawnTimer += deltaTime;
    if (this.runeSpawnTimer >= 5.0) { // every 5 seconds
      this.runeSpawnTimer = 0.0;
      this.spawnRune();
    }

    // Update & rotate existing runes
    for (let i = this.runes.length - 1; i >= 0; i--) {
      const rune = this.runes[i];
      rune.position.x -= this.currentSpeed * deltaTime;
      rune.rotation.y += deltaTime * 2.5;

      // Check player capture overlap
      if (this.playerInstance && this.playerInstance.collider.intersectsSphere(
         new THREE.Sphere(rune.position, 0.8)
      )) {
        this.scene.remove(rune);
        this.runes.splice(i, 1);
        this.handleRuneCollected();
        continue;
      }

      // Despawn off screen left
      if (rune.position.x < CONSTANTS.DESPAWN_X) {
        this.scene.remove(rune);
        this.runes.splice(i, 1);
      }
    }
  }

  toggleLevel3Darkness(dark) {
    const dir = mapBuilder.dirLight;
    const pt = mapBuilder.pointLight;
    if (dark) {
      if (dir) dir.intensity = 0.02; // near total eclipse
      if (pt) pt.intensity = 0.2;
    } else {
      if (dir) dir.intensity = 0.8;
      if (pt) pt.intensity = 1.8;
    }
  }

  spawnRune() {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    // Emissive yellow rune material
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      roughness: 0.1,
      metalness: 0.9
    });
    const rune = new THREE.Mesh(geo, mat);
    rune.position.set(CONSTANTS.SPAWN_X, 1.2, 0);
    this.scene.add(rune);
    this.runes.push(rune);
  }

  handleRuneCollected() {
    this.score += 100 * this.scoreMultiplier;
    audioManager.playScoreMilestone();

    // Trigger HUD notification
    uiManager.playBonusPopup(100, "RUNE");

    // Invoke 2 second invincibility bubble
    if (this.playerInstance) {
      this.playerInstance.isInvincible = true;
      this.playerInstance.invincibilityTimer = 2000; // 2 seconds
      this.playerInstance.flickerTimer = 0;
    }

    // Spawn sparkles particle effects
    this.triggerSparklesVFX(this.playerInstance ? this.playerInstance.model.position : new THREE.Vector3(-5, 1, 0));
  }

  triggerSparklesVFX(pos) {
    const count = 15;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.3;
      positions[i * 3 + 2] = pos.z;

      velocities.push({
        x: (Math.random() - 0.5) * 5,
        y: Math.random() * 4 + 2,
        z: (Math.random() - 0.5) * 5
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffea00,
      size: 0.2,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);

    let life = 0.5;
    const anim = () => {
      if (life <= 0) {
        this.scene.remove(particles);
        geo.dispose();
        mat.dispose();
        return;
      }

      life -= 0.016;
      const arr = particles.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] += velocities[i].x * 0.016;
        arr[i * 3 + 1] += velocities[i].y * 0.016;
        arr[i * 3 + 2] += velocities[i].z * 0.016;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      mat.opacity = life / 0.5;

      requestAnimationFrame(anim);
    };
    anim();
  }

  clearRunes() {
    this.runes.forEach(r => this.scene.remove(r));
    this.runes = [];
  }

  checkCollisions() {
    if (!this.playerInstance) return;

    const player = this.playerInstance;
    const px = CONSTANTS.PLAYER_X;
    const py = player.y;
    // Base player bounding box dims (matches updateCollider in player.js)
    const pHeight = player.isDucking ? 0.8 : 1.6;
    const pWidth = 0.8;

    const pMinX = px - pWidth / 2;
    const pMaxX = px + pWidth / 2;
    const pMinY = py;
    const pMaxY = py + pHeight;

    enemyManager.activeList.forEach(enemy => {
      // Get enemy bounding dims (matches updateCollider in enemy.js)
      let eWidth = 1.0;
      let eHeight = 1.0;

      if (enemy.config.type === 'boss') {
        eWidth = 2.4;
        eHeight = 2.2;
      } else if (enemy.config.type === 'flying') {
        eWidth = 1.1;
        eHeight = 0.8;
      } else if (enemy.config.type === 'diving') {
        eWidth = 1.2;
        eHeight = 1.0;
      }

      const scaleFactor = (enemy.model && enemy.model.scale) ? enemy.model.scale.x : enemy.config.scale;
      eWidth *= scaleFactor;
      eHeight *= scaleFactor;

      let eMinX = enemy.x - eWidth / 2;
      let eMaxX = enemy.x + eWidth / 2;
      let eMinY = enemy.y;
      let eMaxY = enemy.y + eHeight;

      // Check overlap in 2D
      const intersects = (pMinX <= eMaxX && pMaxX >= eMinX) && (pMinY <= eMaxY && pMaxY >= eMinY);

      if (intersects) {
        if (!player.isInvincible) {
          player.hit();
          
          this.shakeTimer = 0.3; // 300ms rattle camera

          // If lives reach 0 => Game Over screen
          if (player.lives <= 0) {
            this.handleGameOver();
          }

          // Reset streak combo multi post hit
          this.enemiesPassedStreak = 0;
          this.scoreMultiplier = 1;
        }
      } 
      // 2. Track successful dodge scoring trigger point (passed player X safely)
      else if (!enemy.userDataPassed && enemy.x < CONSTANTS.PLAYER_X - 1.0) {
        enemy.userDataPassed = true; // flag to only count once

        this.totalDodgeCount++;
        this.enemiesPassedStreak++;

        // Calculate multi: x1 -> x2 at 10, x3 at 25, x4 at 50 consecutive dodges
        if (this.enemiesPassedStreak >= 50) this.scoreMultiplier = 4;
        else if (this.enemiesPassedStreak >= 25) this.scoreMultiplier = 3;
        else if (this.enemiesPassedStreak >= 10) this.scoreMultiplier = 2;

        // Reward score bonus points
        const bonus = 50 * this.scoreMultiplier;
        this.score += bonus;

        // Play audio whoosh and popup score float up
        audioManager.playPass();
        uiManager.playBonusPopup(bonus, "DODGE");
      }
    });
  }

  handleLevelCompleted() {
    console.log(`Level ${this.currentLevelNo} successfully complete!`);
    this.currentState = this.states.COMPLETE;
    audioManager.stopMusic();
    audioManager.playComplete();

    // Spawn bonus tallies
    const timePts = 500;
    const dodgePts = this.totalDodgeCount * 30;
    const levelSum = timePts + dodgePts;
    
    this.score += levelSum;

    uiManager.showLevelComplete(this.currentLevelNo, levelSum, {
      timePoints: timePts,
      dodgePoints: dodgePts
    });
  }

  handleGameOver() {
    if (this.currentState === this.states.DYING || this.currentState === this.states.OVER) return;

    console.log(`Game over initiated on Level ${this.currentLevelNo} - starting slow-mo death`);
    this.currentState = this.states.DYING;
    this.dyingTimer = 1.8; // 1.8 seconds of dramatic slow-motion fallout
    
    // Trigger intense, brief screen shake animation effect upon the final life loss
    this.shakeMagnitude = 0.5; // High intensity camera rattle
    this.shakeTimer = 0.6;     // 600ms of vigorous gameplay feedback
    
    // Play programmatic low-pass sweeping riser sound
    audioSynth.playSlowMoSweep();

    audioManager.stopMusic();
  }

  dyingTick(deltaTime, slowDeltaTime) {
    this.dyingTimer -= deltaTime;

    // Slowly scroll map components, update slow enemies, and let player tumble down smoothly
    mapBuilder.update(slowDeltaTime, this.currentSpeed * 0.5, this.currentLevelNo);
    enemyManager.update(slowDeltaTime, this.currentSpeed * 0.5, this.currentLevelNo);

    if (this.playerInstance) {
      this.playerInstance.update(slowDeltaTime);
      // Smoothly track the player's position in slow motion with camera lerps
      this.camTargetPos.set(
        this.playerInstance.model.position.x - 4.5,
        2.5 + this.playerInstance.y * 0.1,
        7.5
      );
    }

    if (this.dyingTimer <= 0) {
      this.dyingTimer = 0.0;
      this.finalizeGameOver();
    }
  }

  finalizeGameOver() {
    this.currentState = this.states.OVER;

    const isNewHigh = this.score > this.highScore;
    if (isNewHigh) {
      this.highScore = this.score;
      uiManager.saveHighScore(this.score);
    }

    uiManager.showGameOver(this.score, this.highScore, isNewHigh);
  }

  handleGameVictory() {
    this.currentState = this.states.VICTORY;
    audioManager.stopMusic();
    audioManager.playComplete();

    const isNewHigh = this.score > this.highScore;
    if (isNewHigh) {
      this.highScore = this.score;
      uiManager.saveHighScore(this.score);
    }

    // Call success HUD summary popup Screen
    uiManager.showVictory(this.score, this.totalDodgeCount, this.playerInstance ? this.playerInstance.lives : 3);
  }

  adjustGraphicsQuality(quality) {
    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.scene.traverse(node => {
        if (node.isLight) {
          node.castShadow = false;
        }
      });
    } else {
      this.renderer.shadowMap.enabled = true;
      this.scene.traverse(node => {
        if (node.isLight && node.id === mapBuilder.dirLight.id) {
          node.castShadow = true;
        }
      });
    }
    console.log(`Graphics quality adapted to: ${quality}`);
  }

  triggerPassObstacle() {
    if (this.currentState !== this.states.PLAYING) return;

    if (!this.passCharges) {
      this.passCharges = 0;
    }

    if (this.passCharges <= 0) {
      uiManager.playBonusPopup(0, 'NO CHARGES! ❌');
      audioManager.playHit();
      return;
    }

    // Find the nearest active enemy on screen
    const enemies = enemyManager.activeList;
    if (!enemies || enemies.length === 0) {
      uiManager.playBonusPopup(0, 'NO ENEMY! ❔');
      return;
    }

    // Sort by proximity to player on horizontal dimension
    enemies.sort((a, b) => Math.abs(a.x - CONSTANTS.PLAYER_X) - Math.abs(b.x - CONSTANTS.PLAYER_X));
    const targetEnemy = enemies[0];

    // Detonate/Vaporize the enemy
    const enemyX = targetEnemy.x;
    const enemyY = targetEnemy.y;

    // Trigger cool disintegration particle explosion at this enemy's position in 3D scene!
    this.triggerVaporizeVFX(enemyX, enemyY);

    // Bypassed/Passed the enemy!
    targetEnemy.despawn();

    // Decrease pass charges
    this.passCharges--;
    const countEl = document.getElementById('pass-charges-count');
    if (countEl) countEl.textContent = `(${this.passCharges})`;

    // Reward player score
    this.score += 500;
    uiManager.playBonusPopup(500, 'OBSTACLE PASSED! ⚡');

    // Play cool swoop audio note
    audioManager.playJump();
  }

  triggerVaporizeVFX(x, y) {
    if (!this.scene) return;

    const count = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x + (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = y + (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;

      // Radial blast direction outward
      velocities.push({
        x: (Math.random() - 0.5) * 8.0,
        y: 4.0 + Math.random() * 6.0,
        z: (Math.random() - 0.5) * 4.0
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffaa00, // Golden cosmic disintegration
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    let life = 0.6; // 600ms of glory
    const animateBlast = () => {
      if (life <= 0) {
        this.scene.remove(points);
        geo.dispose();
        mat.dispose();
        return;
      }

      life -= 0.016;
      const posAttr = points.geometry.attributes.position;
      const array = posAttr.array;

      for (let i = 0; i < count; i++) {
        array[i * 3] += velocities[i].x * 0.016;
        array[i * 3 + 1] += velocities[i].y * 0.016;
        array[i * 3 + 2] += velocities[i].z * 0.016;

        // Apply a little expansion gravity/drift
        velocities[i].y -= 4.0 * 0.016;
      }
      posAttr.needsUpdate = true;
      mat.opacity = life / 0.6;

      requestAnimationFrame(animateBlast);
    };

    animateBlast();
  }

  handleResize() {
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  renderFrame(deltaTime) {
    if (this.currentState === this.states.MENU) {
      this.camera.position.set(0.0, 1.2, 5.0);
      this.camera.lookAt(0.0, 0.5, 0.0);
    } else {
      // Implement screen shake mechanics if timer is active
      if (this.shakeTimer > 0) {
        this.shakeTimer -= deltaTime;
        
        const shakeX = (Math.random() - 0.5) * this.shakeMagnitude * 2;
        const shakeY = (Math.random() - 0.5) * this.shakeMagnitude * 2;
        
        this.camera.position.set(
          this.camTargetPos.x + shakeX,
          this.camTargetPos.y + shakeY,
          this.camTargetPos.z
        );
      } else {
        // Lerp camera position back toward player nicely
        this.camera.position.lerp(this.camTargetPos, this.camLerpSpeed * deltaTime);

        // Add subtle camera sway during high-speed runs to simulate motion turbulence
        if (this.currentState === this.states.PLAYING && this.currentSpeed > 14.0) {
          const speedExcess = this.currentSpeed - 14.0;
          const swayMagnitude = Math.min(speedExcess * 0.005, 0.08);
          this.camera.position.x += (Math.random() - 0.5) * swayMagnitude;
        }
      }

      this.camera.lookAt(
        this.camera.position.x + 6.5,
        1.3,
        0
      );
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export const gameManager = new GameManager();
export default gameManager;
