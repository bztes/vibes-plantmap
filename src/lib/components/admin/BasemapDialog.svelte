<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { BASEMAP_PRESETS, type BasemapConfig } from '#lib/basemaps.ts';
	import { saveBasemap } from '#lib/remote/basemaps.remote.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Select from '#lib/components/ui/Select.svelte';

	interface Props {
		open: boolean;
		/** the base map to edit, omit to add a new one */
		basemap?: BasemapConfig & { id: string };
	}

	let { open = $bindable(), basemap }: Props = $props();

	const initial: BasemapConfig = $derived(
		basemap ?? {
			name: '',
			kind: 'style',
			url: '',
			attribution: null,
			tileSize: 256,
			maxZoom: null,
			labels: false
		}
	);
	const form = $derived(saveBasemap.for(basemap?.id ?? 'new'));
	const f = $derived(form.fields);
	const kind = $derived(f.kind.value() ?? initial.kind);
	const formId = $derived(`basemap-${basemap?.id ?? 'new'}`);

	function applyPreset(id: string) {
		const preset = BASEMAP_PRESETS.find((p) => p.id === id);
		if (!preset) return;
		f.set({
			name: preset.name,
			kind: preset.kind,
			url: preset.url,
			attribution: preset.attribution ?? '',
			tileSize: String(preset.tileSize) as '256' | '512',
			maxZoom: preset.maxZoom ?? undefined,
			labels: preset.labels
		});
	}
</script>

<Dialog bind:open title={basemap ? t`Edit base map` : t`Add base map`}>
	<form
		id={formId}
		{...form.enhance(async ({ submit, element }) => {
			if (await submit()) {
				if (!basemap) element.reset();
				open = false;
			}
		})}
		class="grid grid-cols-2 gap-4"
	>
		<div class="col-span-2"><FormIssues issues={f.issues()} /></div>
		{#if basemap}
			<input {...f.id.as('hidden', basemap.id)} />
		{:else}
			<Field label={t`Start from a preset`} for="bm-preset" class="col-span-2">
				<Select id="bm-preset" onchange={(e) => applyPreset(e.currentTarget.value)}>
					<option value="">{t`Custom`}</option>
					{#each BASEMAP_PRESETS as preset (preset.id)}
						<option value={preset.id}>{preset.name} · {new URL(preset.url).hostname}</option>
					{/each}
				</Select>
			</Field>
		{/if}
		<Field
			label={t`Name`}
			for="bm-name"
			issues={f.name.issues()}
			hint={t`Shown in the map switcher`}
		>
			<Input id="bm-name" placeholder={t`Aerial`} {...f.name.as('text', initial.name)} />
		</Field>
		<Field label={t`Type`} for="bm-kind" issues={f.kind.issues()}>
			<Select id="bm-kind" {...f.kind.as('select', initial.kind)}>
				<option value="style">{t`Vector style`}</option>
				<option value="raster">{t`Raster tiles`}</option>
			</Select>
		</Field>
		<Field
			label={kind === 'style' ? t`Style URL` : t`Tile URL`}
			for="bm-url"
			class="col-span-2"
			issues={f.url.issues()}
			hint={kind === 'style'
				? t`A MapLibre style.json, e.g. https://tiles.openfreemap.org/styles/liberty`
				: t`XYZ template with {z}, {x} and {y}, e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png`}
		>
			<Input id="bm-url" {...f.url.as('url', initial.url)} />
		</Field>
		{#if kind === 'raster'}
			<Field
				label={t`Attribution`}
				for="bm-attribution"
				class="col-span-2"
				hint={t`HTML allowed, listed under the map sources`}
				issues={f.attribution.issues()}
			>
				<Input id="bm-attribution" {...f.attribution.as('text', initial.attribution ?? '')} />
			</Field>
			<Field label={t`Tile size`} for="bm-tile-size" issues={f.tileSize.issues()}>
				<Select
					id="bm-tile-size"
					{...f.tileSize.as('select', initial.tileSize === 512 ? '512' : '256')}
				>
					<option value="256">256 px</option>
					<option value="512">512 px</option>
				</Select>
			</Field>
			<Field
				label={t`Max zoom`}
				for="bm-max-zoom"
				hint={t`Highest zoom with tiles, deeper zooms upscale`}
				issues={f.maxZoom.issues()}
			>
				<Input
					id="bm-max-zoom"
					step="1"
					placeholder="22"
					{...f.maxZoom.as('number', initial.maxZoom ?? undefined)}
				/>
			</Field>
			<label class="col-span-2 flex items-start gap-2.5 text-sm text-stone-700">
				<input class="mt-0.5 size-4 accent-leaf-600" {...f.labels.as('checkbox', initial.labels)} />
				<span>
					{t`Show street and place names on top`}
					<span class="block text-xs text-stone-500">
						{t`Uses the labels of the first vector style, useful for aerial imagery`}
					</span>
				</span>
			</label>
		{/if}
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form={formId} loading={!!form.pending}>
			{basemap ? t`Save` : t`Add base map`}
		</Button>
	{/snippet}
</Dialog>
