/**
 * Dino Dash 3D - UI Manager
 */

import { CONSTANTS } from './constants.js';
import { audioManager } from './audio.js';

class UIManager {
  constructor() {
    this.game = null;
    this.currentCarouselIdx = 0;
    
    // Quality settings helper (high/low)
    this.graphicsQuality = localStorage.getItem('dino_graphics_quality') || 'high';
  }

  init(game) {
    this.game = game;

    // Cache sound toggle state
    const soundEnabled = localStorage.getItem('dino_sound_enabled') !== 'false';
    if (!soundEnabled) {
      // Lazy apply mute on load
      const toggle = document.getElementById('quick-sound-toggle');
      if (toggle) toggle.classList.add('muted');
    }

    this.bindEvents();
    this.updateCarouselCard();
    this.loadLeaderboard();

    // Initial detect input mode
    this.detectInputMode();

    // Debounced window resize event registration
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.detectInputMode();
      }, 200);
    });
  }

  bindEvents() {
    // 1. Play Button Click
    document.getElementById('btn-start').addEventListener('click', () => {
      audioManager.ensureContext();
      this.game.startGame(CONSTANTS.DINOS[this.currentCarouselIdx].id);
    });

    // 2. Carousel navigation
    document.getElementById('prev-dino').addEventListener('click', () => {
      this.carouselRotate(-1);
    });
    document.getElementById('next-dino').addEventListener('click', () => {
      this.carouselRotate(1);
    });

    // Toggle stats table minimize / maximize
    const toggleBtn = document.getElementById('btn-toggle-stats');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const card = document.querySelector('.dino-info-card');
        if (card) {
          card.classList.toggle('stats-minimized');
          if (card.classList.contains('stats-minimized')) {
            toggleBtn.setAttribute('title', 'Maximize Stats');
          } else {
            toggleBtn.setAttribute('title', 'Minimize Stats');
          }
        }
      });
    }

    // Keyboard Carousel arrow control
    window.addEventListener('keydown', (e) => {
      // Only control carousel if in home screen context
      const homeScreen = document.getElementById('home-screen');
      if (homeScreen && homeScreen.classList.contains('active')) {
        if (e.key === 'ArrowLeft') {
          this.carouselRotate(-1);
        } else if (e.key === 'ArrowRight') {
          this.carouselRotate(1);
        }
      }
    });

    // 3. Modals Opening / Toggles
    const setupModalTrigger = (btnId, modalId) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      if (btn && modal) {
        btn.addEventListener('click', () => {
          modal.classList.remove('hidden');
        });
        
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
          });
        }
        
        // click background close
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.add('hidden');
          }
        });
      }
    };

    setupModalTrigger('btn-leaderboard', 'leaderboard-modal');
    setupModalTrigger('btn-settings', 'settings-modal');
    setupModalTrigger('btn-how', 'how-modal');

    // 4. Quick Audio Toggle Button
    const sfxBtn = document.getElementById('quick-sound-toggle');
    const updateSoundUI = () => {
      const isMuted = audioManager.toggleMute();
      localStorage.setItem('dino_sound_enabled', !isMuted ? 'true' : 'false');
      
      const soundOptBtn = document.getElementById('opt-sound-toggle');
      if (soundOptBtn) {
        soundOptBtn.textContent = isMuted ? 'OFF' : 'ON';
        if (isMuted) {
          soundOptBtn.classList.remove('active');
        } else {
          soundOptBtn.classList.add('active');
        }
      }

      if (isMuted) {
        sfxBtn.className = 'muted';
      } else {
        sfxBtn.className = 'sound-on';
      }
    };
    sfxBtn.addEventListener('click', updateSoundUI);

    // Sync settings modal options button too
    const soundOptBtn = document.getElementById('opt-sound-toggle');
    if (soundOptBtn) {
      const isMuted = localStorage.getItem('dino_sound_enabled') === 'false';
      soundOptBtn.textContent = isMuted ? 'OFF' : 'ON';
      if (isMuted) {
        soundOptBtn.classList.remove('active');
        sfxBtn.className = 'muted';
      } else {
        soundOptBtn.classList.add('active');
        sfxBtn.className = 'sound-on';
      }
      soundOptBtn.addEventListener('click', updateSoundUI);
    }

    // 5. Graphics quality toggle
    const lowBtn = document.getElementById('g-low');
    const highBtn = document.getElementById('g-high');
    
    if (this.graphicsQuality === 'low') {
      lowBtn.classList.add('active');
      highBtn.classList.remove('active');
    }

    lowBtn.addEventListener('click', () => {
      lowBtn.classList.add('active');
      highBtn.classList.remove('active');
      this.graphicsQuality = 'low';
      localStorage.setItem('dino_graphics_quality', 'low');
      this.game.adjustGraphicsQuality('low');
    });

    highBtn.addEventListener('click', () => {
      highBtn.classList.add('active');
      lowBtn.classList.remove('active');
      this.graphicsQuality = 'high';
      localStorage.setItem('dino_graphics_quality', 'high');
      this.game.adjustGraphicsQuality('high');
    });

    // 6. Next Level tap transition complete screen
    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.game.startNextLevel();
    });

    // 7. Retry Button Game Over
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.game.restartGame();
    });

    // 8. Over Home Button Game Over
    document.getElementById('btn-over-home').addEventListener('click', () => {
      this.showScreen('home-screen');
      this.game.returnToHome();
    });

    // 9. Play Again / Home on Victory
    document.getElementById('btn-victory-again').addEventListener('click', () => {
      this.game.restartGame();
    });
    document.getElementById('btn-victory-home').addEventListener('click', () => {
      this.showScreen('home-screen');
      this.game.returnToHome();
    });

    // 9.5 Pause Screen Button Handlers
    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      this.game.resumeGame();
    });
    document.getElementById('btn-pause-quit').addEventListener('click', () => {
      this.game.quitGame();
    });

    // 10. Virtual keys hooks for Touch Layouts
    this.bindMobileButtons();

    // Clear leaderboard button
    document.getElementById('btn-clear-leaderboard').addEventListener('click', () => {
      if (confirm("Are you sure you want to clear your high scores?")) {
        localStorage.removeItem('dino_dash_leaderboard');
        this.loadLeaderboard();
      }
    });

    // Pass Button click handler
    const passBtn = document.getElementById('btn-pass-action');
    if (passBtn) {
      passBtn.addEventListener('click', () => {
        if (this.game) {
          this.game.triggerPassObstacle();
        }
      });
    }

    // Pause Button click handler
    const pauseBtnInGame = document.getElementById('btn-pause-action');
    if (pauseBtnInGame) {
      pauseBtnInGame.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.game) {
          if (this.game.currentState === this.game.states.PLAYING) {
            this.game.pauseGame();
          } else if (this.game.currentState === this.game.states.PAUSED) {
            this.game.resumeGame();
          }
        }
      });
    }

    // Global custom event for boss incoming warning
    window.addEventListener('boss_incoming', () => {
      this.showBossWarning();
    });
  }

  bindMobileButtons() {
    const jumpBtn  = document.getElementById('mobile-jump');
    const duckBtn  = document.getElementById('mobile-duck');

    const applyPress = (btn, action, opts = {}) => {
      if (!btn) return;
      const onDown = (e) => {
        e.preventDefault();
        e.stopPropagation(); /* CRITICAL: stops window touchend from also firing */
        btn.classList.add('pressed');
        /* Haptic feedback — 30ms light pulse, feels like a click */
        if (navigator.vibrate) navigator.vibrate(28);
        action(true);
      };

      const onUp = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (opts.onRelease) opts.onRelease();
      };

      btn.addEventListener('touchstart', onDown, { passive: false });
      btn.addEventListener('touchend',   onUp,   { passive: false });
      btn.addEventListener('touchcancel',onUp,   { passive: false });
      /* Also support mouse for PC testing */
      btn.addEventListener('mousedown', onDown);
      btn.addEventListener('mouseup',   onUp);
      btn.addEventListener('mouseleave',onUp);
    };

    applyPress(jumpBtn, () => {
      if (this.game && this.game.playerInstance) this.game.playerInstance.jump();
    });

    applyPress(duckBtn, () => {
      if (this.game && this.game.playerInstance) this.game.playerInstance.duck(true);
    }, {
      onRelease: () => {
        if (this.game && this.game.playerInstance) this.game.playerInstance.duck(false);
      }
    });
  }

  detectInputMode() {
    const hasTouch = navigator.maxTouchPoints > 0
      || window.matchMedia('(pointer: coarse)').matches;
    const isMobileSize = window.innerWidth < 1100;
    this.isTouchDevice = hasTouch;

    const controls = document.getElementById('mobile-controls');
    const spaceHint = document.querySelector('.space-start-hint');
    const howModal = document.getElementById('how-modal-body');

    if (!controls) return;

    if (hasTouch || isMobileSize) {
      /* Show virtual gamepad */
      controls.style.display = 'flex';
      /* Hide keyboard hint text that means nothing on mobile */
      if (spaceHint) spaceHint.style.display = 'none';
      /* Update HOW TO PLAY modal controls diagram for mobile */
      if (howModal) this.updateHowToPlayForMobile(howModal);
    } else {
      controls.style.display = 'none';
      if (spaceHint) spaceHint.style.display = 'block';
    }
  }

  updateHowToPlayForMobile(container) {
    if (!container) return;
    /* Replace keyboard key display with touch gesture diagram */
    const mobileControls = [
      { icon: '↑', action: 'TAP JUMP BUTTON — or swipe up' },
      { icon: '↓', action: 'HOLD DUCK BUTTON — or swipe down' },
      { icon: '⚡', action: 'TAP PASS BUTTON — use once per level' }
    ];
    container.innerHTML = `
      <div class="controls-diagram">
        ${mobileControls.map(c => `
          <div class="control-key">
            <div class="key" style="font-size:2rem;padding:.3rem .8rem">${c.icon}</div>
            <span>${c.action}</span>
          </div>
        `).join('')}
      </div>
      <p class="instructions font-bold text-orange mt-2">Tap anywhere else to PAUSE.</p>
    `;
  }

  carouselRotate(direction) {
    this.currentCarouselIdx += direction;
    if (this.currentCarouselIdx < 0) {
      this.currentCarouselIdx = CONSTANTS.DINOS.length - 1;
    } else if (this.currentCarouselIdx >= CONSTANTS.DINOS.length) {
      this.currentCarouselIdx = 0;
    }

    this.updateCarouselCard();
    this.game.carouselSelectionChanged(CONSTANTS.DINOS[this.currentCarouselIdx].id);
  }

  updateCarouselCard() {
    const dino = CONSTANTS.DINOS[this.currentCarouselIdx];
    document.getElementById('dino-name').textContent = dino.name;
    document.getElementById('dino-desc').textContent = dino.description;

    // Convert stats (e.g. 8/10 becomes 80% bar fill)
    document.getElementById('stat-speed').style.width = `${dino.stats.speed * 10}%`;
    document.getElementById('stat-jump').style.width = `${dino.stats.jump * 10}%`;
    document.getElementById('stat-armor').style.width = `${dino.stats.armor * 10}%`;
  }

  setLoadingProgress(percent) {
    document.getElementById('loading-bar-fill').style.width = `${percent}%`;
    document.getElementById('loading-percentage').textContent = `${percent}%`;
  }

  showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.ui-screen');
    screens.forEach(s => s.classList.remove('active'));

    const activeHUD = document.getElementById('hud');
    if (screenId === 'hud') {
      activeHUD.classList.add('active');
      activeHUD.classList.add('hud-active-animate');
    } else {
      activeHUD.classList.remove('active');
      activeHUD.classList.remove('hud-active-animate');
      const targetScreen = document.getElementById(screenId);
      if (targetScreen) targetScreen.classList.add('active');
    }
  }

  wipeTransition(callback) {
    const wipe = document.getElementById('cinematic-wipe');
    if (!wipe) { callback(); return; }
    wipe.classList.add('wiping-in');
    setTimeout(() => {
      callback(); // swap level inside
      wipe.classList.remove('wiping-in');
      wipe.classList.add('wiping-out');
      setTimeout(() => wipe.classList.remove('wiping-out'), 130);
    }, 130);
  }

  updateSpeedGauge(normalizedValue) {
    const fill = document.getElementById('gauge-fill');
    if (!fill) return;
    
    const val = Math.max(0, Math.min(1, normalizedValue));
    const fullArcLength = 188.5;
    const offset = fullArcLength * (1 - val);
    fill.setAttribute('stroke-dashoffset', offset);
    
    const color = this.interpolateHexColor("#00cc88", "#ff3333", val);
    fill.setAttribute('stroke', color);
  }

  interpolateHexColor(c1, c2, factor) {
    const parse = (c) => parseInt(c.slice(1), 16);
    const hex1 = parse(c1);
    const hex2 = parse(c2);
    
    const r1 = (hex1 >> 16) & 255;
    const g1 = (hex1 >> 8) & 255;
    const b1 = hex1 & 255;
    
    const r2 = (hex2 >> 16) & 255;
    const g2 = (hex2 >> 8) & 255;
    const b2 = hex2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  updateHUD(lives, score, highScore, levelNo, speed, progressPercent, multiplierValue) {
    // Build lives heart elements
    const container = document.getElementById('hearts-container');
    if (container) {
      container.innerHTML = "❤️".repeat(Math.max(0, lives));
    }

    // Pad score figures
    const padStr = (num, length = 6) => String(num).padStart(length, '0');
    
    // Score pulse check
    const scoreValEl = document.getElementById('score-val');
    if (scoreValEl) {
      const oldScoreText = scoreValEl.textContent;
      const newScoreText = padStr(score);
      if (oldScoreText !== newScoreText) {
        scoreValEl.textContent = newScoreText;
        scoreValEl.classList.remove('score-pulse');
        void scoreValEl.offsetWidth; // trigger reflow
        scoreValEl.classList.add('score-pulse');
      }
    }

    const highScoreEl = document.getElementById('high-score-val');
    if (highScoreEl) {
      highScoreEl.textContent = padStr(highScore);
    }

    const levelEl = document.getElementById('level-num');
    if (levelEl) {
      levelEl.textContent = `LEVEL ${levelNo}`;
    }

    const speedEl = document.getElementById('speed-val');
    if (speedEl) {
      speedEl.textContent = speed.toFixed(1);
    }

    // Solve for normalized speed across levels config
    const levelConfig = CONSTANTS.LEVELS[levelNo] || CONSTANTS.LEVELS[1];
    const sMin = levelConfig.startSpeed || 8.0;
    const sMax = levelConfig.maxSpeed || 20.0;
    const speedRange = sMax - sMin;
    const normalizedSpeed = speedRange > 0 ? (speed - sMin) / speedRange : 0;
    this.updateSpeedGauge(normalizedSpeed);

    // Apply redzone class toggle for reactive breathing animations under high stress
    const hudEl = document.getElementById('hud');
    if (hudEl) {
      if (normalizedSpeed >= 0.75) {
        hudEl.classList.add('hud-redzone');
      } else {
        hudEl.classList.remove('hud-redzone');
      }
    }

    // Fill level bar progress
    const progressEl = document.getElementById('level-progress-fill');
    if (progressEl) {
      progressEl.style.width = `${progressPercent}%`;
    }

    // Mult combo multiplier
    const mBadge = document.getElementById('multiplier-badge');
    if (mBadge) {
      if (multiplierValue > 1) {
        mBadge.classList.add('active');
        mBadge.textContent = `${multiplierValue}x`;
        mBadge.style.display = 'flex';
      } else {
        mBadge.style.display = 'none';
        mBadge.classList.remove('active');
      }
    }
  }

  showBossWarning() {
    const banner = document.getElementById('boss-alert');
    if (!banner) return;
    
    banner.classList.remove('hidden');
    // Force a reflow
    void banner.offsetWidth;
    banner.classList.add('visible');
    banner.classList.add('animate-shake');

    // Hide flash indicator after 3 seconds
    setTimeout(() => {
      banner.classList.remove('visible');
      banner.classList.remove('animate-shake');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 400); // Allow slide transition out
    }, 3000);
  }

  /**
   * Spawns floating popup text on HUD for bonus collection
   */
  playBonusPopup(points, label = '') {
    const popupArea = document.getElementById('hud-popups');
    if (!popupArea) return;

    const popup = document.createElement('div');
    popup.className = 'popup-bonus';
    // Float randomly around the center/bottom
    popup.style.left = `${30 + Math.random() * 40}%`;
    popup.style.top = `${40 + Math.random() * 20}%`;
    popup.textContent = `+${points} ${label}`;

    popupArea.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 800);
  }

  showLevelComplete(levelNo, totalBonuses, stats) {
    const config = CONSTANTS.LEVELS[levelNo];
    document.getElementById('complete-level-name').textContent = config.name;
    
    document.getElementById('bonus-time').textContent = `+${stats.timePoints} pts`;
    document.getElementById('bonus-passed').textContent = `+${stats.dodgePoints} pts`;
    document.getElementById('text-orange');
    document.getElementById('bonus-total').textContent = `+${totalBonuses} pts`;

    this.showScreen('level-complete-screen');
  }

  showGameOver(score, highScore, isNewRecord) {
    const padStr = (num, length = 6) => String(num).padStart(length, '0');
    document.getElementById('end-score').textContent = padStr(score);
    document.getElementById('end-high-score').textContent = padStr(highScore);

    const recordNotify = document.getElementById('high-score-notify');
    if (isNewRecord) {
      recordNotify.classList.remove('hidden');
      this.triggerConfetti();
    } else {
      recordNotify.classList.add('hidden');
    }

    // Determine Star rating based on scoring (1, 2, or 3 stars)
    const starList = document.querySelectorAll('#star-rating .star');
    starList.forEach(s => s.classList.remove('filled'));

    let starsAwarded = 1;
    if (score >= 4000) starsAwarded = 3;
    else if (score >= 1500) starsAwarded = 2;

    for (let i = 0; i < starsAwarded; i++) {
      if (starList[i]) starList[i].classList.add('filled');
    }

    this.showScreen('game-over-screen');
  }

  showVictory(score, enemiesPassed, livesRemaining) {
    const padStr = (num, length = 6) => String(num).padStart(length, '0');
    document.getElementById('v-score').textContent = padStr(score);
    document.getElementById('v-passed').textContent = enemiesPassed;
    document.getElementById('v-lives').textContent = `${livesRemaining}/3`;

    this.triggerConfetti();
    this.showScreen('victory-screen');
  }

  /**
   * Leaderboard save logic persistence
   */
  saveHighScore(score) {
    const leaderboard = JSON.parse(localStorage.getItem('dino_dash_leaderboard')) || [];
    const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    
    const entry = { score, date: dateStr };
    leaderboard.push(entry);
    
    // Sort descending
    leaderboard.sort((a,b) => b.score - a.score);
    
    // Cap to 5 items
    const topFive = leaderboard.slice(0, 5);
    localStorage.setItem('dino_dash_leaderboard', JSON.stringify(topFive));

    // Update board UI
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    const leaderboard = JSON.parse(localStorage.getItem('dino_dash_leaderboard')) || [];
    list.innerHTML = '';

    if (leaderboard.length === 0) {
      list.innerHTML = `<div class="lead-row empty">No high scores recorded. Make a dash!</div>`;
      return;
    }

    leaderboard.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'lead-row';
      if (idx === 0) row.classList.add('gold-star'); // Highlight top score

      row.innerHTML = `
        <span>
          <span class="lead-idx">#${idx+1}</span> &nbsp;&nbsp; 
          <span class="font-bold">${entry.score.toLocaleString()}</span>
        </span>
        <span class="opacity-60 text-xs">${entry.date}</span>
      `;
      list.appendChild(row);
    });
  }

  highScoreRetrieved() {
    const leaderboard = JSON.parse(localStorage.getItem('dino_dash_leaderboard')) || [];
    return leaderboard[0] ? leaderboard[0].score : 0;
  }

  /**
   * Dynamic gold stars falling confetti effects (Performance-optimized, GPU-accelerated CSS Confetti)
   */
  triggerConfetti() {
    const colors = ['#ffcc00', '#ff6600', '#00ffcc', '#00ccff', '#ff3366', '#33cc33'];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden';
    
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      const color = colors[i % colors.length];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.8;
      const duration = 2 + Math.random() * 2.5;
      
      const isCircle = Math.random() > 0.5;
      const borderRadius = isCircle ? '50%' : '2px';
      
      p.style.cssText = `
        position: absolute;
        width: \${size}px;
        height: \${size}px;
        background: \${color};
        top: -20px;
        left: \${left}%;
        border-radius: \${borderRadius};
        opacity: 0.85;
        animation: cssConfettiFall \${duration}s cubic-bezier(0.25, 1, 0.5, 1) \${delay}s forwards;
      `;
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    
    // Auto-clean wrapper
    setTimeout(() => {
      wrap.remove();
    }, 4500);
  }
}

export const uiManager = new UIManager();
export default uiManager;
