/**
 * Dino Dash 3D - Programmatic Web Audio API Synthesizer
 */
class AudioSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMeteorRumble() {
    try {
      this.init();
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(70, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn("Audio Context denied or failed:", e);
    }
  }

  playLaunchRoar() {
    try {
      this.init();
      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(110, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110.5, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);
    } catch (e) {
      console.warn("Audio Context denied or failed:", e);
    }
  }

  playSlowMoSweep() {
    try {
      this.init();
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(160, now + 1.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.linearRampToValueAtTime(300, now + 1.6);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.6);
    } catch (e) {
      console.warn("Audio Context denied or failed:", e);
    }
  }

  playMenuAmbient() {
    try {
      if (localStorage.getItem('dino_sound_enabled') === 'false') {
        return;
      }
      this.init();
      if (this.menuAmbientNodes) {
        return; // Already playing
      }
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const masterGain = this.ctx.createGain();
      
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(55, now); // soft deep low drone
      
      lfo.type = 'sine'; 
      lfo.frequency.setValueAtTime(0.15, now); // ultra slow breathing rate
      
      lfoGain.gain.setValueAtTime(0.04, now);
      masterGain.gain.setValueAtTime(0.06, now);
      
      lfo.connect(lfoGain); 
      lfoGain.connect(masterGain.gain);
      osc.connect(masterGain); 
      masterGain.connect(this.ctx.destination);
      
      osc.start(now); 
      lfo.start(now);
      
      this.menuAmbientNodes = [osc, lfo, masterGain];
    } catch (e) {
      console.warn("Audio Context denied or failed for menu ambient:", e);
    }
  }

  stopMenuAmbient() {
    if (this.menuAmbientNodes) {
      this.menuAmbientNodes.forEach(n => {
        try {
          n.stop();
        } catch(e) {}
      });
      this.menuAmbientNodes = null;
    }
  }
}

export const audioSynth = new AudioSynth();
