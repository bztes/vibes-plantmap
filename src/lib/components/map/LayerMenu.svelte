<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Check, Layers, Map, Satellite } from '@lucide/svelte';
	import type { Basemap } from '#lib/basemaps.ts';
	import Switch from '#lib/components/ui/Switch.svelte';

	const STORAGE_KEY = 'plantmap:basemap';

	interface Props {
		value: string | null;
		basemaps: Basemap[];
		showMature: boolean;
	}

	let { value = $bindable(), basemaps, showMature = $bindable() }: Props = $props();

	const item =
		'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:bg-stone-100 focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0';

	let open = $state(false);
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;

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
		aria-label={t`Map layers`}
		title={t`Map layers`}
		aria-haspopup="menu"
		aria-expanded={open}
		class="flex size-9 items-center justify-center rounded-lg border border-stone-200 bg-white/95 text-stone-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:outline-none"
		onclick={() => (open = !open)}
	>
		<Layers class="size-4" />
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute left-0 mt-2 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
		>
			{#if basemaps.length > 0}
				<div class="border-b border-stone-100 p-1">
					<div class="px-3 pt-1.5 pb-1 text-xs font-medium text-stone-500">{t`Base map`}</div>
					{#each basemaps as b (b.id)}
						{@const Icon = b.kind === 'raster' && b.labels ? Satellite : Map}
						<button
							type="button"
							role="menuitemradio"
							aria-checked={b.id === value}
							class={[item, b.id === value && 'font-medium text-stone-900']}
							onclick={() => {
								remember(b.id);
								close(true);
							}}
						>
							<Icon />
							<span class="min-w-0 flex-1 truncate">{b.name}</span>
							{#if b.id === value}<Check class="text-leaf-600" />{/if}
						</button>
					{/each}
				</div>
			{/if}
			<label class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-stone-700">
				<span class="flex items-center gap-2">
					<span class="size-3 rounded-full border border-dashed border-stone-600"></span>
					{t`Mature size`}
				</span>
				<Switch bind:checked={showMature} label={t`Show mature size`} />
			</label>
		</div>
	{/if}
</div>
