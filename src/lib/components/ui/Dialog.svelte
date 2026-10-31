<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';
	import IconButton from './IconButton.svelte';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { open = $bindable(), title, description, children, footer }: Props = $props();

	function sync(dialog: HTMLDialogElement) {
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}
</script>

<dialog
	{@attach sync}
	class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-stone-950/40 backdrop:backdrop-blur-sm"
	onclose={() => (open = false)}
	onclick={(e) => e.target === e.currentTarget && (open = false)}
>
	{#if open}
		<div class="flex items-start justify-between gap-4 border-b border-stone-100 px-6 pt-5 pb-4">
			<div>
				<h2 class="text-lg font-semibold text-stone-900">{title}</h2>
				{#if description}<p class="mt-1 text-sm text-stone-500">{description}</p>{/if}
			</div>
			<IconButton label={t`Close`} onclick={() => (open = false)}><X /></IconButton>
		</div>
		<div class="px-6 py-5">{@render children()}</div>
		{#if footer}
			<div class="flex justify-end gap-2 border-t border-stone-100 bg-stone-50 px-6 py-3">
				{@render footer()}
			</div>
		{/if}
	{/if}
</dialog>
