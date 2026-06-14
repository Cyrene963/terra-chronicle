/* =========================================================
   Terra Chronicle - Professional Sound System
   Using native Web Audio API for lightweight, high-quality audio
   ========================================================= */
'use strict';

const TerraSound = (function() {
  let audioContext = null;
  let masterGain = null;
  let soundBuffers = {};
  let currentMusic = null;
  let isMuted = false;
  let masterVolume = 0.7;

  // Sound definitions with generated audio parameters
  const soundDefs = {
    // Planting: soft dirt sound (low freq thump)
    plant: { type: 'noise', duration: 0.15, freq: 120, decay: 0.08, volume: 0.3 },

    // Harvest: satisfying collect sound (rising tone)
    harvest: { type: 'tone', duration: 0.2, freq: [440, 880], decay: 0.15, volume: 0.4 },

    // Logging: wood chop sound (sharp attack, low resonance)
    chop: { type: 'noise', duration: 0.25, freq: 180, decay: 0.2, volume: 0.35 },

    // Battle hit: impact sound (punchy, mid-freq)
    hit: { type: 'noise', duration: 0.12, freq: 200, decay: 0.1, volume: 0.5 },

    // Alchemy success: magical chime (harmonious tones)
    chime: { type: 'tone', duration: 0.6, freq: [523.25, 659.25, 783.99], decay: 0.4, volume: 0.35 },

    // Card play: whoosh sound (filtered sweep)
    whoosh: { type: 'sweep', duration: 0.3, freq: [800, 200], decay: 0.25, volume: 0.3 },

    // UI click: subtle tap
    click: { type: 'tone', duration: 0.05, freq: 600, decay: 0.04, volume: 0.2 },

    // Water splash: high-freq sparkle
    splash: { type: 'noise', duration: 0.2, freq: 400, decay: 0.15, volume: 0.25 }
  };

  // Initialize Web Audio API
  function init() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = masterVolume;

      // Generate all sound buffers
      for (const name in soundDefs) {
        soundBuffers[name] = generateSound(soundDefs[name]);
      }

      // Resume context on user interaction (browser autoplay policy)
      const resumeContext = () => {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
      };
      document.addEventListener('pointerdown', resumeContext, { once: true });
      document.addEventListener('keydown', resumeContext, { once: true });

      console.info('[TerraSound] Audio system initialized');
      return true;
    } catch (e) {
      console.warn('[TerraSound] Web Audio API not available:', e);
      return false;
    }
  }

  // Generate procedural sound using Web Audio API
  function generateSound(def) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * def.duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (def.type === 'tone') {
      // Pure tone or chord
      const freqs = Array.isArray(def.freq) ? def.freq : [def.freq];
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t / def.decay);
        let sample = 0;
        for (const freq of freqs) {
          sample += Math.sin(2 * Math.PI * freq * t) / freqs.length;
        }
        data[i] = sample * envelope * def.volume;
      }
    } else if (def.type === 'noise') {
      // Filtered noise (percussion/impact)
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t / def.decay);
        const noise = (Math.random() * 2 - 1);
        // Simple low-pass filter for tonality
        const filtered = noise * Math.sin(2 * Math.PI * def.freq * t * 0.5);
        data[i] = filtered * envelope * def.volume;
      }
    } else if (def.type === 'sweep') {
      // Frequency sweep (whoosh)
      const [startFreq, endFreq] = def.freq;
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const progress = t / def.duration;
        const freq = startFreq + (endFreq - startFreq) * progress;
        const envelope = Math.exp(-t / def.decay);
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * def.volume;
      }
    }

    return buffer;
  }

  // Play a sound effect
  function play(name, volume = 1.0) {
    if (!audioContext || isMuted || !soundBuffers[name]) return;

    try {
      const source = audioContext.createBufferSource();
      source.buffer = soundBuffers[name];

      const gain = audioContext.createGain();
      gain.gain.value = volume;

      source.connect(gain);
      gain.connect(masterGain);
      source.start(0);
    } catch (e) {
      console.warn('[TerraSound] Error playing sound:', name, e);
    }
  }

  // Background music (peaceful ambient loop)
  function startMusic() {
    if (!audioContext || isMuted || currentMusic) return;

    try {
      // Generate soothing ambient pad (layered sine waves)
      const notes = [261.63, 329.63, 392.00]; // C major chord
      const duration = 8; // 8-second loop

      const playAmbientLoop = () => {
        if (isMuted || !audioContext) return;

        notes.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.type = 'sine';
          osc.frequency.value = freq;

          // Slow fade in/out for seamless loop
          gain.gain.setValueAtTime(0, audioContext.currentTime);
          gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 2);
          gain.gain.setValueAtTime(0.08, audioContext.currentTime + duration - 2);
          gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + duration);

          // Loop
          if (i === 0) {
            osc.onended = () => {
              if (!isMuted && currentMusic) {
                setTimeout(playAmbientLoop, 100);
              }
            };
          }
        });
      };

      currentMusic = true;
      playAmbientLoop();
      console.info('[TerraSound] Background music started');
    } catch (e) {
      console.warn('[TerraSound] Error starting music:', e);
    }
  }

  // Stop background music
  function stopMusic() {
    currentMusic = null;
  }

  // Set master volume (0.0 - 1.0)
  function setVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
    if (masterGain) {
      masterGain.gain.value = isMuted ? 0 : masterVolume;
    }
  }

  // Toggle mute
  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain) {
      masterGain.gain.value = isMuted ? 0 : masterVolume;
    }
    if (isMuted) {
      stopMusic();
    }
    return isMuted;
  }

  // Get current state
  function getState() {
    return {
      initialized: !!audioContext,
      muted: isMuted,
      volume: masterVolume,
      musicPlaying: !!currentMusic
    };
  }

  return {
    init,
    play,
    startMusic,
    stopMusic,
    setVolume,
    toggleMute,
    getState
  };
})();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.TerraSound = TerraSound;
}
