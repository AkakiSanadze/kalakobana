(function(root, factory) {
  const audio = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = audio;
  }
  if (typeof root !== 'undefined') {
    root.KALAKOBANA_AUDIO = audio;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  function getContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function setMuted(muted) {
    isMuted = Boolean(muted);
  }

  function getMuted() {
    return isMuted;
  }

  // Helper to create short tones with exponential volume envelope
  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0) {
    if (isMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio context might be restricted
    }
  }

  // Sound effects
  function playClick() {
    playTone(600, 'sine', 0.05, 0.05);
  }

  function playTick(isUrgent = false) {
    if (isUrgent) {
      playTone(880, 'triangle', 0.08, 0.15);
    } else {
      playTone(440, 'triangle', 0.05, 0.08);
    }
  }

  function playTimeUp() {
    if (isMuted) return;
    playTone(330, 'sawtooth', 0.2, 0.15, 0);
    playTone(261.6, 'sawtooth', 0.4, 0.2, 0.15);
  }

  function playValid() {
    if (isMuted) return;
    playTone(523.25, 'sine', 0.1, 0.1, 0);       // C5
    playTone(659.25, 'sine', 0.15, 0.12, 0.08);  // E5
  }

  function playInvalid() {
    if (isMuted) return;
    playTone(220, 'triangle', 0.15, 0.12, 0);
    playTone(196, 'triangle', 0.2, 0.12, 0.1);
  }

  function playReveal() {
    if (isMuted) return;
    playTone(440, 'sine', 0.1, 0.08, 0);
    playTone(554.37, 'sine', 0.15, 0.08, 0.06);
    playTone(659.25, 'sine', 0.2, 0.1, 0.12);
  }

  function playVictory() {
    if (isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      playTone(freq, 'triangle', 0.35, 0.15, idx * 0.12);
    });
  }

  function playDefeat() {
    if (isMuted) return;
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, idx) => {
      playTone(freq, 'sine', 0.3, 0.12, idx * 0.15);
    });
  }

  return {
    getContext,
    setMuted,
    getMuted,
    playTone,
    playClick,
    playTick,
    playTimeUp,
    playValid,
    playInvalid,
    playReveal,
    playVictory,
    playDefeat
  };
});
