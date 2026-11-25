<script lang="ts">
	import { getLocale, t } from '@bztes/vibes-t0n';
	import { CalendarClock, Pause, Play, RotateCcw, Sun } from '@lucide/svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import { isSunUp, momentOf, type SunPosition } from '#lib/sun.ts';

	interface Props {
		/** years from today */
		years: number;
		max?: number;
		/** whether the map draws the trees' shadows */
		shadows: boolean;
		/** day of the year the shadows are drawn for, 1 = 1 January */
		day: number;
		/** time of day the shadows are drawn for, in minutes after midnight */
		minute: number;
		/** where the sun stands at that moment, in the year the timeline shows */
		sun: SunPosition;
	}

	let {
		years = $bindable(),
		max = 60,
		shadows = $bindable(),
		day = $bindable(),
		minute = $bindable(),
		sun
	}: Props = $props();

	const currentYear = new Date().getFullYear();
	const shadowDate = $derived(momentOf(currentYear + years, day, minute));
	const sunUp = $derived(isSunUp(sun));
	const formatDate = (month: 'long' | 'short') =>
		shadowDate.toLocaleDateString(getLocale(), { day: 'numeric', month });
	const dateLabel = $derived(formatDate('long'));
	/** on the button, which has little room */
	const shortDateLabel = $derived(formatDate('short'));
	const timeLabel = $derived(
		shadowDate.toLocaleTimeString(getLocale(), { hour: 'numeric', minute: '2-digit' })
	);
	const directions = $derived([t`N`, t`NE`, t`E`, t`SE`, t`S`, t`SW`, t`W`, t`NW`]);
	const sunLabel = $derived.by(() => {
		const direction = directions[Math.round(sun.azimuth / (Math.PI / 4)) % 8];
		const altitude = Math.round((sun.altitude * 180) / Math.PI);
		return t`Sun in the ${direction}, ${altitude}° high`;
	});

	function toggleShadows(on: boolean) {
		// start at midday rather than show nothing at night
		if (on && !sunUp) minute = 12 * 60;
	}

	let playing = $state(false);
	let open = $state(false);
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;

	$effect(() => {
		if (!playing) return;
		const interval = setInterval(() => {
			if (years >= max) playing = false;
			else years += 1;
		}, 200);
		return () => clearInterval(interval);
	});

	function toggle() {
		if (!playing && years >= max) years = 0;
		playing = !playing;
	}

	function close(refocus = false) {
		open = false;
		if (refocus) trigger.focus();
	}
</script>

{#snippet heading(label: string, value: string)}
	<div class="mb-1 flex items-baseline justify-between text-xs">
		<span class="text-stone-500">{label}</span>
		<span class="font-semibold text-stone-900 tabular-nums">{value}</span>
	</div>
{/snippet}

<svelte:window
	onclick={(e) => open && !root.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && close(true)}
/>

<div bind:this={root} class="relative">
	<button
		bind:this={trigger}
		type="button"
		aria-label={t`Timeline`}
		title={t`Timeline`}
		aria-haspopup="dialog"
		aria-expanded={open}
		class={[
			'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:outline-none',
			(years !== 0 || shadows) && 'px-2.5'
		]}
		onclick={() => (open = !open)}
	>
		<CalendarClock class="size-4" />
		<!-- show that the map isn't at today while the popup is closed -->
		{#if years !== 0}
			<span class="text-sm font-semibold text-stone-900 tabular-nums">{currentYear + years}</span>
		{/if}
		{#if shadows}
			<Sun class={['size-4', sunUp ? 'text-amber-500' : 'text-stone-400']} />
			<span class="text-sm font-semibold whitespace-nowrap text-stone-900 tabular-nums">
				{shortDateLabel}
				{timeLabel}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label={t`Timeline`}
			class="absolute left-0 mt-2 w-72 max-w-[calc(100vw-6rem)] rounded-xl border border-stone-200 bg-white shadow-lg"
		>
			<div class="flex items-center gap-3 px-3 py-2">
				<IconButton
					label={playing ? t`Pause` : t`Play growth`}
					variant="primary"
					small
					onclick={toggle}
				>
					{#if playing}<Pause />{:else}<Play />{/if}
				</IconButton>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex items-baseline justify-between text-xs">
						<span class="font-semibold text-stone-900 tabular-nums">{currentYear + years}</span>
						<span class="text-stone-500">
							{years === 0 ? t`Today` : years === 1 ? t`in 1 year` : t`in ${years} years`}
						</span>
					</div>
					<Slider
						min={0}
						{max}
						step={1}
						bind:value={years}
						aria-label={t`Year`}
						oninput={() => (playing = false)}
					/>
				</div>
				<IconButton
					label={t`Back to today`}
					small
					disabled={years === 0}
					onclick={() => (years = 0)}
				>
					<RotateCcw />
				</IconButton>
			</div>

			<div class="border-t border-stone-100 px-3 py-2">
				<label class="flex items-center justify-between gap-3 text-sm text-stone-700">
					<span class="flex items-center gap-2">
						<Sun class="size-4 text-amber-500" />
						{t`Shadows`}
					</span>
					<Switch bind:checked={shadows} label={t`Show shadows`} onchange={toggleShadows} />
				</label>
				{#if shadows}
					<div class="mt-2 space-y-2.5 pb-1">
						<div>
							{@render heading(t`Day`, dateLabel)}
							<Slider
								min={1}
								max={365}
								step={1}
								bind:value={day}
								aria-label={t`Day of the year`}
								aria-valuetext={dateLabel}
							/>
						</div>
						<div>
							{@render heading(t`Time`, timeLabel)}
							<Slider
								min={0}
								max={24 * 60 - 15}
								step={15}
								bind:value={minute}
								aria-label={t`Time of day`}
								aria-valuetext={timeLabel}
							/>
						</div>
						<p class="text-xs text-stone-500" aria-live="polite">
							{sunUp ? sunLabel : t`The sun is below the horizon.`}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
