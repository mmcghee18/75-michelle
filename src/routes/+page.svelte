<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { tracker, toISO, fromISO, TOTAL_DAYS } from '#lib/tracker.svelte.ts';
	import { celebrate, PALETTE } from '#lib/celebrate.ts';
	import { blip, unblip, fanfare, powerup } from '#lib/sound.ts';

	const CHEERS = [
		'Flawless victory!',
		'Combo x3!',
		'High score!',
		'Achievement unlocked!',
		'You leveled up!',
		'Perfect run!',
		'+100 XP'
	];

	const today = toISO(new Date());
	const todayIndex = $derived(tracker.days.indexOf(today));
	const pastDays = $derived(tracker.days.filter((d) => d < today));
	const futureDays = $derived(tracker.days.filter((d) => d > today));
	let showPast = $state(false);
	let showFuture = $state(false);

	let editing = $state(false);
	let popped = $state<string | null>(null);
	let party = $state<{ day: number; cheer: string } | null>(null);
	let partyTimer: ReturnType<typeof setTimeout>;
	let pickerOpen = $state(false);
	let picker = $state<HTMLElement>();
	let muted = $state(false);

	try {
		muted = localStorage.getItem('75-muted') === '1';
	} catch {}

	function toggleMute() {
		muted = !muted;
		try {
			localStorage.setItem('75-muted', muted ? '1' : '0');
		} catch {}
	}

	const color = (i: number) => PALETTE[i % PALETTE.length];
	const pad = (n: number) => String(n).padStart(2, '0');

	$effect(() => {
		if (!picker) return;
		const onPick = (e: Event) => {
			tracker.addHabit((e as CustomEvent<{ unicode: string }>).detail.unicode);
			pickerOpen = false;
		};
		picker.addEventListener('emoji-click', onPick);
		return () => picker?.removeEventListener('emoji-click', onPick);
	});

	function check(date: string, habitId: string, dayNumber: number) {
		const completed = tracker.toggle(date, habitId);
		const checked = tracker.isChecked(date, habitId);
		if (checked) {
			popped = `${date}|${habitId}`;
			navigator.vibrate?.(12);
		}
		if (completed) {
			celebrate(tracker.habitsOn(date).map((h) => h.emoji));
			if (!muted) fanfare();
			navigator.vibrate?.([30, 40, 30, 40, 80]);
			party = { day: dayNumber, cheer: CHEERS[Math.floor(Math.random() * CHEERS.length)] };
			clearTimeout(partyTimer);
			partyTimer = setTimeout(() => (party = null), 2800);
		} else if (!muted) {
			checked ? blip() : unblip();
		}
	}

	function claimReward(date: string) {
		tracker.toggleReward(date);
		if (tracker.hasReward(date)) {
			popped = `${date}|reward`;
			navigator.vibrate?.([15, 30, 15]);
			if (!muted) powerup();
		} else if (!muted) {
			unblip();
		}
	}

	const fmt = (iso: string) =>
		fromISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

	onMount(() => {
		import('emoji-picker-element'); // registers <emoji-picker>
	});
</script>

<svelte:head>
	<title>habits</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#snippet day(date: string, i: number)}
	{@const complete = tracker.isComplete(date)}
	{@const future = date > today}
	<article
		id={date === today ? 'today' : undefined}
		class="panel"
		class:today={date === today}
		class:complete
		class:future
	>
		<div class="day-label">
			<span class="num">{date === today ? '▶ ' : ''}DAY {pad(i + 1)}</span>
			<span class="date">{date === today ? 'Today' : fmt(date)}</span>
		</div>
		<div class="checks">
			<!-- colors follow each habit's position in the full list, so they stay stable -->
			{#each tracker.habits as habit, h (habit.id)}
				{#if tracker.isActive(habit, date)}
					{@const checked = tracker.isChecked(date, habit.id)}
					<button
						class="tile"
						class:checked
						class:pop={popped === `${date}|${habit.id}`}
						style:--c={color(h)}
						disabled={future}
						aria-pressed={checked}
						aria-label="{habit.emoji} on day {i + 1}"
						onclick={() => check(date, habit.id, i + 1)}
					>
						<span>{habit.emoji}</span>
					</button>
				{/if}
			{/each}
		</div>
		<button
			class="tile reward"
			class:checked={tracker.hasReward(date)}
			class:pop={popped === `${date}|reward`}
			disabled={!complete}
			aria-pressed={tracker.hasReward(date)}
			aria-label="🧋 reward on day {i + 1}"
			title={complete ? 'Claim your reward' : 'Finish every habit to unlock'}
			onclick={() => claimReward(date)}
		>
			<span>🧋</span>
		</button>
		{#if complete}
			<span class="done-tag">DONE</span>
		{/if}
	</article>
{/snippet}

<main>
	<header>
		<div class="title-row">
			<h1>75michelle</h1>
			<button class="mute" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
				{muted ? '🔇' : '🔊'}
			</button>
		</div>
		<div class="hud">
			<span class="day-count">
				DAY {todayIndex === -1 ? '--' : pad(todayIndex + 1)}<small>/{TOTAL_DAYS}</small>
			</span>
			<span class="xp-label">★ {tracker.perfectDays}</span>
		</div>
		<div class="xp" aria-hidden="true">
			{#each tracker.days as date, i (date)}
				<span
					class:on={tracker.isComplete(date)}
					class:now={date === today}
					style:--c={color(i)}
				></span>
			{/each}
		</div>
	</header>

	<section class="panel habits">
		<div class="panel-head">
			<h2>HABITS</h2>
			<button class="btn small" onclick={() => (editing = !editing)}>
				{editing ? 'DONE' : 'EDIT'}
			</button>
		</div>

		<ul>
			{#each tracker.habits as habit, i (habit.id)}
				{#if !habit.removedOn}
					<li style:--c={color(i)}>
						{habit.emoji}
						{#if editing}
							<button
								class="remove"
								aria-label="Remove {habit.emoji}"
								onclick={() => tracker.removeHabit(habit.id)}>✕</button
							>
						{/if}
					</li>
				{/if}
			{/each}
			{#if editing || tracker.currentHabits.length === 0}
				<li class="add">
					<button
						aria-label="Add a habit"
						aria-expanded={pickerOpen}
						onclick={() => (pickerOpen = !pickerOpen)}>+</button
					>
				</li>
			{/if}
		</ul>

		{#if pickerOpen}
			<div class="picker" transition:fly={{ y: -8, duration: 150 }}>
				<emoji-picker bind:this={picker}></emoji-picker>
			</div>
		{/if}

		{#if editing}
			<label class="start" transition:fly={{ y: -8, duration: 150 }}>
				START DATE
				<input type="date" bind:value={tracker.startDate} />
			</label>
		{/if}
	</section>

	<section class="days">
		{#if pastDays.length}
			<button class="panel fold" aria-expanded={showPast} onclick={() => (showPast = !showPast)}>
				<span class="fold-label">
					{showPast ? '▼' : '▶'} PAST DAYS
					<small>{pastDays.filter((d) => tracker.isComplete(d)).length}/{pastDays.length} done</small>
				</span>
				<span class="mini">
					{#each pastDays as date (date)}
						<span class:on={tracker.isComplete(date)}></span>
					{/each}
				</span>
			</button>
			{#if showPast}
				{#each pastDays as date, i (date)}
					{@render day(date, i)}
				{/each}
			{/if}
		{/if}

		{#if tracker.days.includes(today)}
			{@render day(today, pastDays.length)}
		{:else if !pastDays.length}
			<p class="waiting">STARTS {fmt(tracker.startDate).toUpperCase()}</p>
		{/if}

		{#if futureDays.length}
			<button
				class="panel fold"
				aria-expanded={showFuture}
				onclick={() => (showFuture = !showFuture)}
			>
				<span class="fold-label">
					{showFuture ? '▼' : '▶'} UPCOMING
					<small>{futureDays.length} to go</small>
				</span>
			</button>
			{#if showFuture}
				{#each futureDays as date, i (date)}
					{@render day(date, TOTAL_DAYS - futureDays.length + i)}
				{/each}
			{/if}
		{/if}
	</section>
</main>

{#if party}
	<div class="party" role="status">
		<div class="card">
			<p class="level">LEVEL {party.day}</p>
			<h3>DONE!</h3>
			<p class="cheer">{party.cheer}</p>
		</div>
	</div>
{/if}

<style>
	:global(:root) {
		--bg: #fdf6e3;
		--surface: #ffffff;
		--ink: #1b1b2f;
		--muted: #8b8aa0;
		--empty: #ece6d6;
		--pixel: 'Press Start 2P', monospace;
		--body: 'Pixelify Sans', system-ui, sans-serif;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #141423;
			--surface: #1f1f35;
			--ink: #f2f0ff;
			--muted: #7c7a99;
			--empty: #2c2c48;
		}
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--body);
		font-size: 17px;
	}
	:global(*) {
		box-sizing: border-box;
	}

	main {
		max-width: 600px;
		height: 100svh;
		margin: 0 auto;
		padding: 28px 16px 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* ---------- shared bits ---------- */
	.panel {
		background: var(--surface);
		border: 3px solid var(--ink);
		box-shadow: 4px 4px 0 var(--ink);
	}
	.btn {
		font-family: var(--pixel);
		font-size: 0.7rem;
		color: #1b1b2f;
		background: #ffbe0b;
		border: 3px solid var(--ink);
		box-shadow: 3px 3px 0 var(--ink);
		padding: 0 14px;
		cursor: pointer;
	}
	.btn.small {
		font-size: 0.6rem;
		padding: 6px 10px;
	}
	.btn:active:not(:disabled) {
		transform: translate(3px, 3px);
		box-shadow: none;
	}
	.btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ---------- header / HUD ---------- */
	header {
		margin-bottom: 24px;
		flex-shrink: 0;
	}
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h1 {
		font-family: var(--pixel);
		font-size: clamp(1.1rem, 5.5vw, 1.7rem);
		margin: 0;
		color: #ff4d6d;
		text-shadow: 3px 3px 0 var(--ink);
	}
	.mute {
		background: none;
		border: none;
		font-size: 1.3rem;
		cursor: pointer;
		padding: 4px;
	}
	.hud {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin: 18px 0 8px;
		font-family: var(--pixel);
	}
	.day-count {
		font-size: 1rem;
	}
	.day-count small {
		font-size: 0.6rem;
		color: var(--muted);
	}
	.xp-label {
		font-size: 0.7rem;
		color: #ffbe0b;
	}
	.xp {
		display: flex;
		gap: 2px;
		height: 16px;
		padding: 3px;
		border: 3px solid var(--ink);
		background: var(--surface);
	}
	.xp span {
		flex: 1;
		background: var(--empty);
	}
	.xp span.on {
		background: var(--c);
	}
	.xp span.now {
		outline: 2px solid var(--ink);
	}

	/* ---------- habits panel ---------- */
	.habits {
		padding: 14px;
		margin-bottom: 10px;
		flex-shrink: 0;
	}
	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h2 {
		font-family: var(--pixel);
		font-size: 0.75rem;
		margin: 0;
	}
	.habits ul {
		list-style: none;
		padding: 0;
		margin: 14px 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.habits li {
		position: relative;
		width: 46px;
		height: 46px;
		display: grid;
		place-items: center;
		font-size: 1.4rem;
		background: var(--c);
		border: 3px solid var(--ink);
		box-shadow: 3px 3px 0 var(--ink);
	}
	.habits li.add {
		background: var(--empty);
	}
	.add button {
		width: 100%;
		height: 100%;
		border: none;
		background: none;
		font-family: var(--pixel);
		font-size: 1rem;
		color: var(--ink);
		cursor: pointer;
	}
	.add button[aria-expanded='true'] {
		color: #ff4d6d;
	}
	.remove {
		position: absolute;
		top: -10px;
		right: -10px;
		border: 2px solid var(--ink);
		background: #ff4d6d;
		color: white;
		width: 20px;
		height: 20px;
		font-size: 0.65rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}
	input {
		font: inherit;
		color: var(--ink);
		background: var(--bg);
		border: 3px solid var(--ink);
		border-radius: 0;
		padding: 8px 10px;
		min-width: 0;
	}
	input:focus {
		outline: none;
		border-color: #4cc9f0;
	}
	.picker {
		margin-top: 16px;
	}
	.picker emoji-picker {
		width: 100%;
		height: 260px;
		--background: var(--surface);
		--border-color: var(--ink);
		--border-size: 3px;
		--border-radius: 0;
		--input-border-color: var(--ink);
		--input-border-radius: 0;
		--input-font-color: var(--ink);
		--indicator-color: #ff4d6d;
		--outline-color: #4cc9f0;
		--button-active-background: var(--empty);
		--button-hover-background: var(--empty);
	}
	.start {
		font-family: var(--pixel);
		font-size: 0.55rem;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 16px;
	}
	.start input {
		padding: 4px 8px;
		font-family: var(--body);
		font-size: 0.9rem;
	}

	/* ---------- day rows ---------- */
	.days {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
		/* room for the hard shadows and DONE tags inside the scroll area */
		padding: 14px 10px 24px 0;
		margin-right: -10px;
		mask-image: linear-gradient(to bottom, transparent, black 12px);
	}
	article.future {
		opacity: 0.4;
		box-shadow: none;
	}
	.waiting {
		font-family: var(--pixel);
		font-size: 0.65rem;
		color: var(--muted);
		text-align: center;
		margin-top: 24px;
	}
	.fold {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		font: inherit;
		color: var(--ink);
		text-align: left;
		cursor: pointer;
		flex-shrink: 0;
	}
	.fold:active {
		transform: translate(4px, 4px);
		box-shadow: none;
	}
	.fold-label {
		font-family: var(--pixel);
		font-size: 0.6rem;
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.fold-label small {
		font-size: inherit;
		color: var(--muted);
	}
	.mini {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
	}
	.mini span {
		width: 10px;
		height: 10px;
		background: var(--empty);
		border: 2px solid var(--ink);
	}
	.mini span.on {
		background: #3ddc97;
	}
	article {
		position: relative;
		padding: 12px;
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}
	article.today {
		border-color: #ff4d6d;
		box-shadow: 4px 4px 0 #ff4d6d;
	}
	.day-label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 84px;
	}
	.num {
		font-family: var(--pixel);
		font-size: 0.6rem;
	}
	.today .num {
		color: #ff4d6d;
	}
	.date {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		flex: 1;
	}
	.done-tag {
		position: absolute;
		right: -6px;
		top: -12px;
		font-family: var(--pixel);
		font-size: 0.5rem;
		padding: 5px 6px;
		background: #3ddc97;
		color: #1b1b2f;
		border: 2px solid var(--ink);
		animation: drop 0.3s steps(3);
	}

	/* ---------- the tile checkbox ---------- */
	.tile {
		width: 46px;
		height: 46px;
		padding: 0;
		font-size: 1.4rem;
		display: grid;
		place-items: center;
		background: var(--empty);
		border: 3px solid var(--ink);
		box-shadow: 3px 3px 0 var(--ink);
		cursor: pointer;
		transition: transform 0.05s;
	}
	.tile span {
		filter: grayscale(1);
		opacity: 0.3;
	}
	.tile:active:not(:disabled) {
		transform: translate(3px, 3px);
		box-shadow: none;
	}
	.tile:disabled {
		cursor: default;
		box-shadow: none;
	}
	.tile.checked {
		background: var(--c);
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--ink);
	}
	.tile.checked span {
		filter: none;
		opacity: 1;
	}
	.reward {
		--c: #d4a373;
		margin-left: auto;
		flex-shrink: 0;
	}
	.reward:disabled {
		border-style: dashed;
	}
	.reward:not(.checked) span {
		filter: none;
		opacity: 0.9;
	}
	.tile.pop span {
		animation: hop 0.3s steps(4);
	}

	/* ---------- level clear ---------- */
	.party {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
		z-index: 10;
	}
	.card {
		background: var(--surface);
		border: 4px solid var(--ink);
		box-shadow: 8px 8px 0 var(--ink);
		padding: 24px 36px;
		text-align: center;
		animation: drop 0.35s steps(4);
	}
	.level {
		font-family: var(--pixel);
		font-size: 0.7rem;
		margin: 0;
		color: var(--muted);
	}
	.card h3 {
		font-family: var(--pixel);
		font-size: 2rem;
		margin: 14px 0;
		color: #ffbe0b;
		text-shadow: 3px 3px 0 var(--ink);
		animation: rainbow 0.6s steps(1) infinite;
	}
	.cheer {
		margin: 0;
		font-size: 1.1rem;
	}

	@keyframes hop {
		50% {
			transform: translateY(-8px) scale(1.2);
		}
	}
	@keyframes drop {
		from {
			transform: translateY(-24px) scale(1.4);
			opacity: 0;
		}
	}
	@keyframes rainbow {
		0% {
			color: #ffbe0b;
		}
		25% {
			color: #ff4d6d;
		}
		50% {
			color: #3ddc97;
		}
		75% {
			color: #4cc9f0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tile.pop span,
		.done-tag,
		.card,
		.card h3 {
			animation: none;
		}
	}
</style>
