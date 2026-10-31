<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Map, Satellite } from '@lucide/svelte';
	import type { Basemap } from '#lib/basemaps.ts';
	import Select from '#lib/components/ui/Select.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';

	const STORAGE_KEY = 'plantmap:basemap';

	let { value = $bindable(), basemaps }: { value: string | null; basemaps: Basemap[] } = $props();

	// remember the choice per browser; storage may be unavailable (private mode etc.)
	$effect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && basemaps.some((b) => b.id === stored)) value = stored;
		} catch {
			/* keep default */
		}
	});

	function remember(id: string) {
		value = id;
		try {
			localStorage.setItem(STORAGE_KEY, id);
		} catch {
			/* not persisted */
		}
	}
</script>

<div class="rounded-xl border border-stone-200 bg-white/95 p-1 shadow-md backdrop-blur">
	{#if basemaps.length <= 3}
		<SegmentedControl
			label={t`Base map`}
			value={value ?? ''}
			onchange={remember}
			options={basemaps.map((b) => ({
				value: b.id,
				label: b.name,
				icon: b.kind === 'raster' && b.labels ? Satellite : Map
			}))}
		/>
	{:else}
		<Select
			size="sm"
			aria-label={t`Base map`}
			class="min-w-36 [&_select]:border-0 [&_select]:shadow-none"
			value={value ?? ''}
			onchange={(e) => remember(e.currentTarget.value)}
		>
			{#each basemaps as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
		</Select>
	{/if}
</div>
