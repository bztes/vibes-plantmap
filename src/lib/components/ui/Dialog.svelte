<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
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
	class="m-auto w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-stone-950/40 backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
	onclose={() => (open = false)}
	onclick={(e) => e.target === e.currentTarget && (open = false)}
>
	{#if open}
		<!-- a bottom sheet on phones, header and footer stay put while the body scrolls -->
		<div class="flex max-h-[min(48rem,calc(100dvh-2rem))] flex-col max-sm:max-h-[90dvh]">
			<div
				class="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 px-6 pt-5 pb-4"
			>
				<div>
					<h2 class="text-lg font-semibold text-stone-900">{title}</h2>
					{#if description}<p class="mt-1 text-sm text-stone-500">{description}</p>{/if}
				</div>
				<IconButton label={t`Close`} onclick={() => (open = false)}><X /></IconButton>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">{@render children()}</div>
			{#if footer}
				<div
					class="flex shrink-0 justify-end gap-2 border-t border-stone-100 bg-stone-50 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
				>
					{@render footer()}
				</div>
			{/if}
		</div>
	{/if}
</dialog>
