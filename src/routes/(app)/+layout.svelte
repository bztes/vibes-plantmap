<script lang="ts">
	import type { LayoutProps } from './$types';
	import { getCurrentUser } from '#lib/remote/auth.remote.ts';
	import AppHeader from '#lib/components/layout/AppHeader.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	let { children }: LayoutProps = $props();

	const user = $derived(await getCurrentUser());
</script>

<div class="flex h-full flex-col">
	{#if user}<AppHeader {user} />{/if}
	<main class="min-h-0 flex-1 overflow-y-auto">
		<svelte:boundary>
			{@render children()}
			{#snippet pending()}<Spinner />{/snippet}
		</svelte:boundary>
	</main>
</div>
