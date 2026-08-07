import { getState, setMusicEnabled } from './state.js';

let context;
let started = false;
let music;

const noteFrequencies = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
};

function ensureContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function tone(frequency, duration = 0.12, type = 'sine', gain = 0.09, delay = 0) {
  if (!getState().musicEnabled) return;
  const ctx = ensureContext();
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const start = ctx.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export function playEffect(name) {
  if (name === 'click') tone(310, 0.07, 'triangle', 0.045);
  if (name === 'correct') {
    tone(523.25, 0.12, 'sine', 0.08);
    tone(659.25, 0.16, 'sine', 0.07, 0.09);
  }
  if (name === 'error') {
    tone(190, 0.14, 'sawtooth', 0.035);
    tone(145, 0.18, 'sawtooth', 0.03, 0.08);
  }
  if (name === 'awaken') {
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => tone(frequency, 0.55, 'sine', 0.055, index * 0.12));
  }
}

export function playBell(note = 'C5') {
  const frequency = noteFrequencies[note] || noteFrequencies.C5;
  tone(frequency, 0.7, 'sine', 0.11);
  tone(frequency * 2.01, 0.46, 'sine', 0.035, 0.015);
  tone(frequency * 3.02, 0.28, 'sine', 0.018, 0.025);
}

export function initAudio() {
  music = document.querySelector('#background-music');
  music.volume = 0.16;
  const toggle = document.querySelector('#sound-toggle');

  const start = () => {
    if (started) return;
    started = true;
    ensureContext();
    if (getState().musicEnabled) music.play().catch(() => {});
  };
  document.addEventListener('pointerdown', start, { once: true, capture: true });

  toggle.addEventListener('click', () => {
    start();
    const enabled = !getState().musicEnabled;
    setMusicEnabled(enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Выключить звук' : 'Включить звук');
    toggle.querySelector('.sound-toggle__text').textContent = enabled ? 'Звук включён' : 'Звук выключен';
    toggle.querySelector('[aria-hidden]').textContent = enabled ? '♪' : '×';
    if (enabled) music.play().catch(() => {});
    else music.pause();
    if (enabled) playEffect('click');
  });
}
