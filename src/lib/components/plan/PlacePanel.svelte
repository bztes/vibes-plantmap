<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { Check } from '@lucide/svelte';
	import type { PlannedTree } from '#lib/plan.ts';
	import { matureSizeLabel } from '#lib/species.ts';
	import { getPanel } from '#lib/components/panel/panel.ts';
	import Button from '#lib/components/ui/Button.svelte';
	import ColorSwatch from '#lib/components/ui/ColorSwatch.svelte';

	interface Props {
		tree: PlannedTree;
		/** true when an existing tree is moved, false for a new one */
		moving: boolean;
		onplace: () => void;
		oncancel: () => void;
	}

	let { tree, moving, onplace, oncancel }: Props = $props();

	const panel = getPanel();
</script>

<div
	{@attach panel.peek}
	class="flex shrink-0 flex-col gap-3 px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pt-4"
>
	<div class="flex items-start gap-3">
		<ColorSwatch color={tree.color} class="mt-1 size-3.5" />
		<div class="min-w-0 flex-1">
			<h2 class="truncate text-base font-semibold text-stone-900">
				{moving ? t`Move ${tree.label || tree.speciesName}` : tree.speciesName}
			</h2>
			<p class="text-xs text-stone-500">{t`Move the map until the cross is on the spot.`}</p>
		</div>
	</div>
	<div class="grid grid-cols-2 gap-2">
		<Button variant="outline" onclick={oncancel}>{t`Cancel`}</Button>
		<Button onclick={onplace}><Check /> {moving ? t`Move here` : t`Plant here`}</Button>
	</div>
</div>

{#if panel.wide}
	<div class="px-4 py-2 text-sm text-stone-600">
		<p>
			{matureSizeLabel(tree)}.
			{t`The dotted ring is the crown when fully grown. Move the timeline to check how it fits in later years.`}
		</p>
	</div>
{/if}
