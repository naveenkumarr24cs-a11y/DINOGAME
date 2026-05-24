/**
 * Dino Dash 3D - Web Audio API Synthesis Engine & Procedural Music
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.sfxVolume = null;
    this.musicVolume = null;
    
    this.isMuted = false;
    this.musicPlaying = false;
    this.musicIntervalId = null;
    this.currentLevel = 1;
    this.beatCount = 0;
    
    // Noise buffer cache
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return; // Already initialized

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // Node chain: Master -> Destination
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);

      // SFX Node
      this.sfxVolume = this.ctx.createGain();
      this.sfxVolume.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxVolume.connect(this.masterVolume);

      // Music Node
      this.musicVolume = this.ctx.createGain();
      this.musicVolume.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.musicVolume.connect(this.masterVolume);

      // Pre-compile 1 second of white noise
      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      console.log("Web Audio Context initiated successfully.");
    } catch (e) {
      console.error("Failed to initialize Web Audio API:", e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterVolume) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- Sound Effects Generation ---

  playJump() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    osc.type = "sine";
    const now = this.ctx.currentTime;
    
    // Frequency sweep up (120ms)
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playLand() {
    this.ensureContext();
    if (this.isMuted || !this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const duration = 0.08; // 80ms

    // Low thud noise source
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);
    filter.Q.setValueAtTime(5, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    noise.start(now);
    noise.stop(now + duration);
  }

  playPass() {
    this.ensureContext();
    if (this.isMuted || !this.ctx || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const duration = 0.20; // 200ms

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + duration);
    filter.Q.setValueAtTime(3, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    noise.start(now);
    noise.stop(now + duration);
  }

  playHit() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.40; // 300ms to 400ms

    // Low rumble frequency
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(20, now + duration);

    // Filter to muddy it up
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, now);

    // Distortion shaper
    const waveShaper = this.ctx.createWaveShaper();
    const makeDistortionCurve = (amount = 50) => {
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    };
    waveShaper.curve = makeDistortionCurve(80);
    waveShaper.oversample = '4x';

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(filter);
    filter.connect(waveShaper);
    waveShaper.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    osc.start(now);
    osc.stop(now + duration);
  }

  playScoreMilestone() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    // C5 - E5 - G5 ascending (400ms total)
    const notes = [523.25, 659.25, 783.99]; // frequencies for C5, E5, G5
    const step = 0.10;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * step);
      
      gainNode.gain.setValueAtTime(0, now + idx * step);
      gainNode.gain.linearRampToValueAtTime(0.2, now + idx * step + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * step + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      osc.start(now + idx * step);
      osc.stop(now + idx * step + 0.18);
    });
  }

  playComplete() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Fanfare: C5 - E5 - G5 - C6 (800ms)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const step = 0.14;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * step);
      
      gainNode.gain.setValueAtTime(0, now + idx * step);
      gainNode.gain.linearRampToValueAtTime(0.25, now + idx * step + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * step + 0.35);

      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);

      osc.start(now + idx * step);
      osc.stop(now + idx * step + 0.40);
    });
  }

  playBossWarning() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;

    const now = this.ctx. currentTime;
    const duration = 0.60;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(65, now); // Very low rumble

    lfo.type = "sine";
    lfo.frequency.setValueAtTime(12, now); // Fast tremolo/vibrato LFO

    lfoGain.gain.setValueAtTime(25, now); // Modulate pitch by 25Hz

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(250, now);

    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency); // Modulate pitch

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxVolume);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
  }

  // --- Procedural Background Music Synthesizer ---

  startMusic(level = 1) {
    this.ensureContext();
    if (this.musicPlaying) {
      if (this.currentLevel === level) return;
      this.stopMusic();
    }

    this.currentLevel = level;
    this.musicPlaying = true;
    this.beatCount = 0;

    // Tempo of music (ms per 16th note / 8th note)
    const tempo = level === 1 ? 250 : level === 2 ? 180 : 140; // faster each level

    this.musicIntervalId = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.playProceduralBeat();
    }, tempo);

    console.log(`Procedural background music started for Level ${level}`);
  }

  stopMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    this.musicPlaying = false;
    console.log("Procedural music stopped.");
  }

  playProceduralBeat() {
    const now = this.ctx.currentTime;
    const step = this.beatCount % 16;
    
    // --- Lvl 1: Upbeat tribal drums loop ---
    if (this.currentLevel === 1) {
      // Bass drum on beats 0, 4, 8, 12
      if (step === 0 || step === 4 || step === 8 || step === 12) {
        this.synthDrum(80, 0.15, 0.4, "sine");
      }
      // Low tom on beats 2, 6, 10, 14
      if (step === 2 || step === 10) {
        this.synthDrum(120, 0.12, 0.2, "sine");
      }
      if (step === 6 || step === 14) {
        this.synthDrum(100, 0.12, 0.2, "sine");
      }
      // Accent tribal woodblock on step 3, 7, 11
      if (step === 3 || step === 11) {
        this.synthAccent(800, 0.05, 0.1, "triangle");
      }
      if (step === 7 || step === 15) {
        this.synthAccent(1200, 0.04, 0.1, "triangle");
      }
    }
    
    // --- Lvl 2: Intense volcanic war drums + low ominous bass synth ---
    else if (this.currentLevel === 2) {
      // Intense heartbeat bass drum: 0, 1, 4, 5, 8, 9, 12, 13
      if (step === 0 || step === 1 || step === 8 || step === 9) {
        this.synthDrum(70, 0.18, 0.5, "triangle");
      } else if (step === 4 || step === 12) {
        this.synthDrum(65, 0.2, 0.55, "triangle");
      }
      
      // Ominous Bass line: C2 (65Hz), Eb2 (77Hz), F2 (87Hz), G2 (98Hz)
      const bassNotes = [65.41, 65.41, 77.78, 77.78, 87.31, 87.31, 97.99, 97.99];
      const bassFreq = bassNotes[Math.floor(step / 2)];
      if (step % 2 === 0) {
        this.synthBass(bassFreq, 0.3, 0.25, "sawtooth");
      }

      // Sizzling metallic noise hi-hat on every odd step
      if (step % 2 === 1) {
        this.synthHihat(0.04, 0.08);
      }
    }
    
    // --- Lvl 3: Epic orchestral with dark chanting feel, super fast ---
    else {
      // Rapid bass drum on beats 0, 3, 6, 8, 11, 14 (gallop pattern)
      const gallops = [0, 3, 6, 8, 11, 14];
      if (gallops.includes(step)) {
        this.synthDrum(90, 0.1, 0.6, "sawtooth");
      }

      // Epic chanting tone (vocal-like bandpassed triangle waves)
      // A minor theme: A3(220Hz), C4(261Hz), E4(329Hz), D4(293Hz)
      const vocalTheme = [220.00, 220.00, 261.63, 261.63, 329.63, 329.63, 293.66, 293.66,
                          220.00, 220.00, 261.63, 261.63, 392.00, 392.00, 329.63, 329.63];
      const choralChantFreq = vocalTheme[step];
      
      if (step % 4 === 0 || step % 4 === 2) {
        this.synthChant(choralChantFreq, 0.2, 0.15);
      }

      // Hi-hats fast gallop
      if (step % 4 !== 0) {
        this.synthHihat(0.03, 0.06);
      }
    }

    this.beatCount++;
  }

  synthDrum(startFreq, duration, gainVal, type = "sine") {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.musicVolume);

    osc.type = type;
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    gainNode.gain.setValueAtTime(gainVal, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  synthAccent(freq, duration, gainVal, type = "triangle") {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.musicVolume);

    osc.type = type;
    const now = this.ctx.currentTime;
    
    osc.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(gainVal, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  synthBass(freq, duration, gainVal, type = "sawtooth") {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.musicVolume);

    osc.type = type;
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);

    gainNode.gain.setValueAtTime(gainVal, now);
    gainNode.gain.linearRampToValueAtTime(gainVal * 0.7, now + duration * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  synthHihat(duration, gainVal) {
    if (!this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(8000, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(gainVal, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.musicVolume);

    noise.start(now);
    noise.stop(now + duration);
  }

  synthChant(freq, duration, gainVal) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.musicVolume);

    osc.type = "triangle";
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, now); // vowel formant simulation at ~500Hz
    filter.Q.setValueAtTime(5, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainVal, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }
}

export const audioManager = new AudioManager();
export default audioManager;
