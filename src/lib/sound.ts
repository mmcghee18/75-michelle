// Tiny 8-bit square-wave sound effects via Web Audio — no audio files needed.

let ctx: AudioContext | undefined;

function note(freq: number, start: number, length: number, volume = 0.06) {
	ctx ??= new AudioContext();
	const t = ctx.currentTime + start;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'square';
	osc.frequency.setValueAtTime(freq, t);
	gain.gain.setValueAtTime(volume, t);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t);
	osc.stop(t + length);
}

/** Coin-style blip for checking a habit. */
export function blip() {
	note(988, 0, 0.06);
	note(1319, 0.06, 0.18);
}

/** Soft low blip for unchecking. */
export function unblip() {
	note(330, 0, 0.08, 0.04);
}

/** Level-clear fanfare. */
export function fanfare() {
	[523, 659, 784, 1047, 784, 1047].forEach((f, i) => note(f, i * 0.09, i === 5 ? 0.4 : 0.1));
}

/** Rising power-up sweep for claiming the reward. */
export function powerup() {
	[392, 523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.045, 0.08, 0.05));
}
