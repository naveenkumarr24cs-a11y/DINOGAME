/**
 * Dino Dash 3D - Entry Module with Cinematic Intro
 */

import { assetLoader } from './loader.js';
import { gameManager } from './game.js';
import { uiManager } from './ui.js';
import { audioSynth } from './audio-synth.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log("Dino Dash 3D: Initialising launcher with Cinematic Intro...");
  uiManager.detectInputMode();

  let loadingComplete = false;
  let introTimerComplete = false;
  const minimumIntroTime = 10000; // 10.0s minimum pacing for epic cinematic feel

  // Interactive UI Rotating preloader subtitles list
  const loaderPhrases = [
    "Waking the dinosaurs...",
    "Charging the asteroid...",
    "Erupting the volcanoes...",
    "Engaging speed caps...",
    "Spawning prehistoric obstacles..."
  ];
  let phraseIndex = 0;
  const phraseInterval = setInterval(() => {
    const phraseEl = document.getElementById('loader-phrase');
    if (phraseEl && !loadingComplete) {
      phraseIndex = (phraseIndex + 1) % loaderPhrases.length;
      phraseEl.style.opacity = 0;
      setTimeout(() => {
        phraseEl.textContent = loaderPhrases[phraseIndex];
        phraseEl.style.opacity = 1;
      }, 200);
    } else if (loadingComplete) {
      clearInterval(phraseInterval);
    }
  }, 1500);

  // Setup Cinematic Intro Sequence timelines:
  
  // 1. Meteor at 0.2s + rumble sound
  setTimeout(() => {
    const meteorContainer = document.querySelector('.meteor-container');
    if (meteorContainer) {
      meteorContainer.classList.add('streak');
    }
    audioSynth.playMeteorRumble();
  }, 200);

  // 2. Logo title stagger-reveal letters grouped by word for perfect centered wrapping
  setTimeout(() => {
    const titleContainer = document.getElementById('intro-title');
    if (titleContainer) {
      const titleText = "DINO DASH 3D";
      titleContainer.innerHTML = '';
      const words = titleText.split(' ');
      
      let letterGlobalIndex = 0;
      words.forEach((word, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'intro-word';
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';
        
        [...word].forEach((letter) => {
          const span = document.createElement('span');
          span.className = 'intro-letter';
          span.textContent = letter;
          // 40ms stagger per character
          span.style.animationDelay = `${letterGlobalIndex * 40}ms`;
          wordSpan.appendChild(span);
          letterGlobalIndex++;
        });
        
        titleContainer.appendChild(wordSpan);
        
        if (wordIdx < words.length - 1) {
          const spaceSpan = document.createElement('span');
          spaceSpan.className = 'intro-space';
          spaceSpan.textContent = '\u00A0';
          titleContainer.appendChild(spaceSpan);
          letterGlobalIndex++;
        }
      });
    }
  }, 1000);

  // 3. Pacing timing minimum release
  setTimeout(() => {
    introTimerComplete = true;
    checkAndUnlockTransition();
  }, minimumIntroTime);

  // Setup callbacks on the preloader
  assetLoader.onProgress((percent, lastAssetId) => {
    uiManager.setLoadingProgress(percent);
  });

  assetLoader.onComplete((loadedAssets) => {
    console.log("Launcher: Preload complete. Awaiting minimum spacing timers...");
    loadingComplete = true;
    checkAndUnlockTransition();
  });

  function checkAndUnlockTransition() {
    if (loadingComplete && introTimerComplete) {
      triggerCinematicWipeTransition();
    }
  }

  function triggerCinematicWipeTransition() {
    const wipe = document.getElementById('cinematic-wipe');
    const introOverlay = document.getElementById('cinematic-intro-overlay');
    const loadingScreen = document.getElementById('loading-screen');

    if (!wipe) {
      uiManager.showScreen('home-screen');
      gameManager.init();
      return;
    }

    // Phase A: Wipe slider animates in over 125ms
    wipe.classList.add('wiping-in');

    setTimeout(() => {
      // Phase B: Peak of wipe - swap screens silently underneath
      if (introOverlay) introOverlay.remove();
      loadingScreen.classList.remove('active');
      
      uiManager.showScreen('home-screen');
      gameManager.init();
      uiManager.detectInputMode();

      // Start the home screen particles
      startEmberParticleLayer();

      // Support title logo glitch effect for sensory crunch
      triggerTitleGlitchCrunch();

      // Swap wipe classes to animate wipe slider OUT to the right
      wipe.classList.remove('wiping-in');
      wipe.classList.add('wiping-out');

      // Phase C: Cleanup wipe slider once done
      setTimeout(() => {
        wipe.classList.remove('wiping-out');
      }, 125);

    }, 125);
  }

  function triggerTitleGlitchCrunch() {
    const titleEl = document.querySelector('.game-title');
    if (titleEl) {
      titleEl.classList.add('glitch-flicker');
      setTimeout(() => {
        titleEl.classList.remove('glitch-flicker');
      }, 500);
    }
  }

  function startEmberParticleLayer() {
    const container = document.getElementById('home-particles-container');
    if (!container) return;
    container.innerHTML = '';

    // Create 34 glowing amber embers floating upward
    for (let i = 0; i < 34; i++) {
      const ember = document.createElement('div');
      ember.className = 'ember-particle';
      
      const size = Math.random() * 3.5 + 1.5;
      ember.style.width = `${size}px`;
      ember.style.height = `${size}px`;
      ember.style.left = `${Math.random() * 100}%`;
      
      const duration = Math.random() * 4 + 3; // 3s to 7s
      ember.style.animationDuration = `${duration}s`;
      ember.style.animationDelay = `${Math.random() * -5}s`; // pre-warm
      
      container.appendChild(ember);
    }
  }

  // Start the loading pipeline
  assetLoader.preload();
});
