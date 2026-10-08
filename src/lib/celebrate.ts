import confetti from 'canvas-confetti';

export const PALETTE = ['#ff4d6d', '#ffbe0b', '#3ddc97', '#4cc9f0', '#9b5de5', '#ff8c42'];

/** Bursts of square "pixel" confetti plus the habit emojis, from both sides. */
export function celebrate(emojis: string[]) {
	const shapes = emojis.slice(0, 8).map((text) => confetti.shapeFromText({ text, scalar: 2.4 }));

	const fire = (origin: { x: number; y: number }, angle: number) => {
		confetti({
			particleCount: 80,
			spread: 70,
			startVelocity: 55,
			angle,
			origin,
			colors: PALETTE,
			shapes: ['square'],
			scalar: 1.3,
			flat: true
		});
		if (shapes.length) {
			confetti({
				particleCount: 20,
				spread: 80,
				startVelocity: 45,
				angle,
				origin,
				shapes,
				scalar: 2.4,
				flat: true
			});
		}
	};

	fire({ x: 0, y: 0.8 }, 60);
	fire({ x: 1, y: 0.8 }, 120);
	setTimeout(() => fire({ x: 0.5, y: 0.9 }, 90), 300);
}
