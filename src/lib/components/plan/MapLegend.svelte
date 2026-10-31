<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { t } from '#lib/i18n/index.ts';
	import Switch from '#lib/components/ui/Switch.svelte';

	let { showMature = $bindable() }: { showMature: boolean } = $props();

	let open = $state(false);
</script>

<div
	class="flex flex-col rounded-xl border border-stone-200 bg-white/95 text-xs text-stone-600 shadow-md backdrop-blur"
>
	<button
		type="button"
		class="flex items-center justify-between gap-3 px-3 py-2 font-medium text-stone-700"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{t`Legend`}
		<ChevronDown class="size-4 transition-transform {open ? '' : 'rotate-180'}" />
	</button>
	{#if open}
		<div class="flex flex-col gap-2 border-t border-stone-100 px-3 pt-2 pb-2.5">
			<div class="flex items-center gap-2">
				<span class="size-3 rounded-full border-2 border-leaf-600 bg-leaf-500/40"></span>
				{t`Crown at selected year`}
			</div>
			<div class="flex items-center gap-2">
				<span class="size-3 rounded-full border-2 border-dashed border-leaf-600 bg-leaf-500/15"
				></span>
				{t`Not planted yet`}
			</div>
			<div class="flex items-center gap-2">
				<span class="size-3 rounded-full border-2 border-red-600"></span>
				{t`Too close`}
			</div>
			<label class="mt-1 flex items-center justify-between gap-3 border-t border-stone-100 pt-2">
				<span class="flex items-center gap-2">
					<span class="size-3 rounded-full border border-dashed border-stone-600"></span>
					{t`Mature size`}
				</span>
				<Switch bind:checked={showMature} label={t`Show mature size`} />
			</label>
		</div>
	{/if}
</div>
