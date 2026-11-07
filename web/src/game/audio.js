// All sound is made here at run time. There are no audio files to download.
export function createAudio() {
  let ctx = null;
  let master;
  let motorA;
  let motorB;
  let motorGain;
  let motorFilter;
  let beltGain;
  let waveGain;
  let muted = false;

  const noiseBuffer = () => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  const loopNoise = (type, freq, q) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(master);
    src.start();
    return g;
  };

  const tone = (freq, to, dur, type = 'triangle', vol = 0.16, delay = 0) => {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  };

  return {
    // Browsers only allow sound to start from a user action.
    unlock() {
      if (ctx) {
        ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);

      motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.value = 420;
      motorGain = ctx.createGain();
      motorGain.gain.value = 0;
      motorA = ctx.createOscillator();
      motorB = ctx.createOscillator();
      motorA.type = 'sawtooth';
      motorB.type = 'square';
      motorA.connect(motorFilter);
      motorB.connect(motorFilter);
      motorFilter.connect(motorGain).connect(master);
      motorA.start();
      motorB.start();

      beltGain = loopNoise('bandpass', 1500, 1.2);
      waveGain = loopNoise('lowpass', 620, 0.3);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.7;
      return muted;
    },
    get muted() {
      return muted;
    },
    update({ speed, throttle, slip, beltOn, waterNear, time }) {
      if (!ctx) return;
      const t = ctx.currentTime;
      const rev = 48 + speed * 26 + slip * 34 + Math.abs(throttle) * 8;
      motorA.frequency.setTargetAtTime(rev, t, 0.05);
      motorB.frequency.setTargetAtTime(rev * 1.503, t, 0.05);
      motorFilter.frequency.setTargetAtTime(260 + speed * 110 + slip * 260, t, 0.08);
      motorGain.gain.setTargetAtTime(0.045 + Math.min(0.1, speed * 0.018 + Math.abs(throttle) * 0.03), t, 0.08);
      beltGain.gain.setTargetAtTime(beltOn ? 0.018 : 0, t, 0.1);
      waveGain.gain.setTargetAtTime((0.06 + 0.1 * waterNear) * (0.65 + 0.35 * Math.sin(time * 0.45)), t, 0.4);
    },
    silence() {
      if (!ctx) return;
      const t = ctx.currentTime;
      motorGain.gain.setTargetAtTime(0, t, 0.1);
      beltGain.gain.setTargetAtTime(0, t, 0.1);
    },
    pick: () => tone(520 + Math.random() * 90, 980, 0.11),
    bank: () => tone(240, 170, 0.09, 'square', 0.08),
    spill: () => tone(620, 130, 0.34, 'sawtooth', 0.09),
    jam: () => {
      tone(150, 52, 0.42, 'sawtooth', 0.28);
      tone(90, 40, 0.5, 'square', 0.14, 0.05);
    },
    clear: () => {
      tone(330, 660, 0.12);
      tone(440, 880, 0.14, 'triangle', 0.14, 0.09);
    },
    hit: (v) => tone(120, 55, 0.2, 'square', Math.min(0.3, 0.07 + v * 0.05)),
    full: () => tone(300, 240, 0.16, 'square', 0.08),
    end: (won) => {
      const notes = won ? [392, 494, 587, 784] : [392, 349, 311, 262];
      notes.forEach((n, i) => tone(n, n, 0.3, 'triangle', 0.16, i * 0.14));
    },
  };
}
