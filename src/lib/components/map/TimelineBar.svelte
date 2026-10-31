<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Pause, Play, RotateCcw } from '@lucide/svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Slider from '#lib/components/ui/Slider.svelte';

	interface Props {
		/** years from today */
		years: number;
		max?: number;
	}

	let { years = $bindable(), max = 60 }: Props = $props();

	let playing = $state(false);
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
</script>

<div
	class="flex w-full max-w-xl items-center gap-3 rounded-xl border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
>
	<IconButton label={playing ? t`Pause` : t`Play growth`} variant="primary" small onclick={toggle}>
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
