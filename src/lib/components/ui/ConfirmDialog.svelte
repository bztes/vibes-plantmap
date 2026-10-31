<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		onconfirm: () => unknown;
	}

	let { open = $bindable(), title, message, confirmLabel, onconfirm }: Props = $props();
	let busy = $state(false);

	async function confirm() {
		busy = true;
		try {
			await onconfirm();
			open = false;
		} finally {
			busy = false;
		}
	}
</script>

<Dialog bind:open {title}>
	<p class="text-sm text-stone-600">{message}</p>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button variant="danger" loading={busy} onclick={confirm}>{confirmLabel ?? t`Delete`}</Button>
	{/snippet}
</Dialog>
