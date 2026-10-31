<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { ArrowDown, ArrowUp, Pencil, Star, Trash2 } from '@lucide/svelte';
	import type { BasemapConfig } from '#lib/basemaps.ts';
	import {
		deleteBasemap,
		moveBasemap,
		setBasemapEnabled,
		setDefaultBasemap
	} from '#lib/remote/basemaps.remote.ts';
	import BasemapDialog from '#lib/components/admin/BasemapDialog.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';
	import TableCell from '#lib/components/ui/TableCell.svelte';
	import TableRow from '#lib/components/ui/TableRow.svelte';

	interface Props {
		basemap: BasemapConfig & { id: string; enabled: boolean; isDefault: boolean };
		first: boolean;
		last: boolean;
	}

	let { basemap, first, last }: Props = $props();
	let editing = $state(false);
	let confirmingDelete = $state(false);
</script>

<TableRow>
	<TableCell>
		<div class="flex items-center gap-2">
			<span class="font-medium text-stone-900">{basemap.name}</span>
			{#if basemap.isDefault}<Badge tone="green">{t`default`}</Badge>{/if}
		</div>
		<div class="max-w-xs truncate text-xs text-stone-500" title={basemap.url}>{basemap.url}</div>
	</TableCell>
	<TableCell>
		{#if basemap.kind === 'style'}<Badge tone="blue">{t`vector style`}</Badge>
		{:else}<Badge>{basemap.labels ? t`raster + labels` : t`raster`}</Badge>{/if}
	</TableCell>
	<TableCell>
		<Switch
			label={t`Show ${basemap.name} to users`}
			checked={basemap.enabled}
			onchange={(enabled) => setBasemapEnabled({ id: basemap.id, enabled })}
		/>
	</TableCell>
	<TableCell>
		<div class="flex justify-end gap-1">
			<IconButton
				small
				label={t`Move up`}
				disabled={first}
				onclick={() => moveBasemap({ id: basemap.id, direction: 'up' })}
			>
				<ArrowUp />
			</IconButton>
			<IconButton
				small
				label={t`Move down`}
				disabled={last}
				onclick={() => moveBasemap({ id: basemap.id, direction: 'down' })}
			>
				<ArrowDown />
			</IconButton>
			<IconButton
				small
				label={t`Make default`}
				disabled={basemap.isDefault}
				onclick={() => setDefaultBasemap(basemap.id)}
			>
				<Star />
			</IconButton>
			<IconButton small label={t`Edit`} onclick={() => (editing = true)}><Pencil /></IconButton>
			<IconButton
				small
				variant="danger-ghost"
				label={t`Delete base map`}
				onclick={() => (confirmingDelete = true)}
			>
				<Trash2 />
			</IconButton>
		</div>
	</TableCell>
</TableRow>

<BasemapDialog bind:open={editing} {basemap} />
<ConfirmDialog
	bind:open={confirmingDelete}
	title={t`Delete base map?`}
	message={t`“${basemap.name}” will no longer be available on any plan.`}
	onconfirm={() => deleteBasemap(basemap.id)}
/>
