<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { CalendarClock, Pause, Play, RotateCcw } from '@lucide/svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';

	interface Props {
		/** years from today */
		years: number;
		max?: number;
	}

	let { years = $bindable(), max = 60 }: Props = $props();

	let playing = $state(false);
	let open = $state(false);
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;
	const currentYear = new Date().getFullYear();

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
			years !== 0 && 'px-2.5'
		]}
		onclick={() => (open = !open)}
	>
		<CalendarClock class="size-4" />
		<!-- show that the map isn't at today while the popup is closed -->
		{#if years !== 0}
			<span class="text-sm font-semibold text-stone-900 tabular-nums">{currentYear + years}</span>
		{/if}
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label={t`Timeline`}
			class="absolute left-0 mt-2 flex w-72 max-w-[calc(100vw-6rem)] items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-lg"
		>
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
			<IconButton label={t`Back to today`} small disabled={years === 0} onclick={() => (years = 0)}>
				<RotateCcw />
			</IconButton>
		</div>
	{/if}
</div>
