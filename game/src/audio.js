// audio.js — all sounds are WebAudio oscillators, made on first user gesture.
// No audio files, no network. M toggles mute.
(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;
  var master = null;

  function ensureContext() {
    if (ctx) { return ctx; }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { return null; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    var c = ensureContext();
    if (c && c.state === 'suspended') { c.resume(); }
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) { return; }
    var c = ensureContext();
    if (!c) { return; }
    var t0 = c.currentTime + (when || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) { osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (muted) { return; }
    var c = ensureContext();
    if (!c) { return; }
    var t0 = c.currentTime;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = c.createBufferSource();
    src.buffer = buf;
    var filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = freq || 800;
    var g = c.createGain();
    g.gain.value = vol || 0.15;
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t0);
  }

  var AudioBank = {
    unlock: unlock,
    toggleMute: function () { muted = !muted; return muted; },
    isMuted: function () { return muted; },
    footstep: function () { noiseBurst(0.06, 0.08, 500); },
    guardStep: function (distance) {
      var vol = Math.max(0.02, 0.16 * (1 - distance / 400));
      noiseBurst(0.07, vol, 300);
    },
    pickup: function () { tone(880, 0.12, 'sine', 0.25); tone(1320, 0.18, 'sine', 0.2, 0.08); },
    jewel: function () {
      tone(523, 0.15, 'triangle', 0.25);
      tone(659, 0.15, 'triangle', 0.25, 0.1);
      tone(784, 0.2, 'triangle', 0.25, 0.2);
      tone(1047, 0.3, 'triangle', 0.25, 0.3);
    },
    coin: function () { tone(2093, 0.25, 'square', 0.08, 0, 1568); },
    coinLand: function () { tone(1568, 0.15, 'sine', 0.2); tone(2093, 0.2, 'sine', 0.15, 0.05); },
    alarm: function () { tone(440, 0.25, 'sawtooth', 0.18, 0, 660); tone(660, 0.25, 'sawtooth', 0.18, 0.25, 440); },
    caught: function () { tone(220, 0.5, 'sawtooth', 0.25, 0, 110); },
    roomClear: function () {
      tone(659, 0.15, 'triangle', 0.25);
      tone(784, 0.15, 'triangle', 0.25, 0.12);
      tone(1047, 0.3, 'triangle', 0.25, 0.24);
    },
    win: function () {
      var notes = [523, 659, 784, 1047, 784, 1047, 1319];
      var i;
      for (i = 0; i < notes.length; i++) { tone(notes[i], 0.22, 'triangle', 0.25, i * 0.14); }
    },
    gameOver: function () {
      tone(392, 0.3, 'triangle', 0.22);
      tone(311, 0.3, 'triangle', 0.22, 0.28);
      tone(262, 0.5, 'triangle', 0.22, 0.56);
    }
  };

  global.HEIST_AUDIO = AudioBank;
})(typeof window !== 'undefined' ? window : globalThis);
