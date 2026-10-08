export const TOTAL_DAYS = 75;

const STORAGE_KEY = '75-tracker';

export type Habit = {
	id: string;
	emoji: string;
	/** first day this habit counts; missing = counts from day 1 */
	addedOn?: string;
	/** first day it no longer counts; missing = still active */
	removedOn?: string;
};

type Saved = {
	startDate: string;
	habits: Habit[];
	/** date (YYYY-MM-DD) -> ids of habits checked that day */
	checks: Record<string, string[]>;
	/** dates where the optional reward was claimed */
	rewards: string[];
};

export function toISO(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

function addDays(iso: string, n: number): string {
	const d = fromISO(iso);
	d.setDate(d.getDate() + n);
	return toISO(d);
}

function load(): Saved {
	const fallback: Saved = {
		startDate: toISO(new Date()),
		habits: [
			{ id: crypto.randomUUID(), emoji: '💧' },
			{ id: crypto.randomUUID(), emoji: '🏃‍♀️' },
			{ id: crypto.randomUUID(), emoji: '📖' }
		],
		checks: {},
		rewards: []
	};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
	} catch {
		return fallback;
	}
}

class Tracker {
	#saved = load();
	startDate = $state(this.#saved.startDate);
	habits = $state<Habit[]>(this.#saved.habits);
	checks = $state<Record<string, string[]>>(this.#saved.checks);
	rewards = $state<string[]>(this.#saved.rewards);

	days = $derived(Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(this.startDate, i)));

	constructor() {
		$effect.root(() => {
			$effect(() => {
				const data: Saved = {
					startDate: this.startDate,
					habits: this.habits,
					checks: this.checks,
					rewards: this.rewards
				};
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
				} catch {
					// storage unavailable (private mode etc.) — keep working in memory
				}
			});
		});
	}

	isChecked(date: string, habitId: string) {
		return this.checks[date]?.includes(habitId) ?? false;
	}

	/** Whether a habit was part of the challenge on a given day. */
	isActive(habit: Habit, date: string) {
		return (!habit.addedOn || habit.addedOn <= date) && (!habit.removedOn || date < habit.removedOn);
	}

	habitsOn(date: string) {
		return this.habits.filter((h) => this.isActive(h, date));
	}

	/** Habits still in play (shown in the habits panel). */
	get currentHabits() {
		return this.habits.filter((h) => !h.removedOn);
	}

	isComplete(date: string) {
		const habits = this.habitsOn(date);
		return habits.length > 0 && habits.every((h) => this.isChecked(date, h.id));
	}

	/** Toggles a check; returns true if this made the day newly complete. */
	toggle(date: string, habitId: string): boolean {
		const wasComplete = this.isComplete(date);
		const current = this.checks[date] ?? [];
		this.checks[date] = current.includes(habitId)
			? current.filter((id) => id !== habitId)
			: [...current, habitId];
		return !wasComplete && this.isComplete(date);
	}

	addHabit(emoji: string) {
		this.habits.push({ id: crypto.randomUUID(), emoji, addedOn: toISO(new Date()) });
	}

	/** The reward only counts once every habit that day is done. */
	hasReward(date: string) {
		return this.isComplete(date) && this.rewards.includes(date);
	}

	toggleReward(date: string) {
		this.rewards = this.rewards.includes(date)
			? this.rewards.filter((d) => d !== date)
			: [...this.rewards, date];
	}

	/**
	 * Retires a habit from today on, keeping its history on earlier days.
	 * If it never counted on any earlier day, it's deleted outright.
	 */
	removeHabit(id: string) {
		const today = toISO(new Date());
		const habit = this.habits.find((h) => h.id === id);
		if (!habit) return;
		const hadHistory = this.days.some((d) => d < today && this.isActive(habit, d));
		if (hadHistory) {
			habit.removedOn = today;
			return;
		}
		this.habits = this.habits.filter((h) => h.id !== id);
		for (const date in this.checks) {
			this.checks[date] = this.checks[date].filter((hid) => hid !== id);
		}
	}

	get perfectDays() {
		return this.days.filter((d) => this.isComplete(d)).length;
	}
}

export const tracker = new Tracker();
