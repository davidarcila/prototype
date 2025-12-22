
// Initialize context lazily to comply with browser autoplay policies
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.2; // Keep global volume non-intrusive
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return { ctx: audioCtx, master: masterGain };
};

export const playFlipSound = () => {
  const { ctx, master } = initAudio();
  if (!ctx || !master) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(master);

  // Short, high-pitch tick/whoosh for the flip start
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
  
  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.start(t);
  osc.stop(t + 0.08);
};

export const playWinSound = (isCrit: boolean) => {
  const { ctx, master } = initAudio();
  if (!ctx || !master) return;

  const t = ctx.currentTime;

  if (isCrit) {
    // Joyful major chord arpeggio for crit
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      
      osc.type = 'triangle';
      osc.frequency.value = f;
      
      const start = t + (i * 0.06);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } else {
    // Pleasant high coin ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(master);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + (Math.random() * 100), t); // Slight variation
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  }
};

export const playUpgradeSound = () => {
  const { ctx, master } = initAudio();
  if (!ctx || !master) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(master);

  // 8-bit powerup slide
  osc.type = 'square';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(880, t + 0.15);

  gain.gain.setValueAtTime(0.05, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.15);

  osc.start(t);
  osc.stop(t + 0.15);
};

export const playPrestigeSound = () => {
  const { ctx, master } = initAudio();
  if (!ctx || !master) return;
  
  const t = ctx.currentTime;
  
  // Mystical low swell
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(master);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 2);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 1);
  gain.gain.linearRampToValueAtTime(0, t + 2);
  
  osc.start(t);
  osc.stop(t + 2);
};
