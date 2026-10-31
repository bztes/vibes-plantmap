<script lang="ts">
	import type { LayoutProps } from './$types';
	import { getCurrentUser } from '#lib/remote/auth.remote.ts';
	import AppHeader from '#lib/components/layout/AppHeader.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	let { children }: LayoutProps = $props();

	// shared plans can be viewed signed out, the header then offers to sign in
	const user = $derived(await getCurrentUser());
</script>

<div class="flex h-full flex-col">
	<AppHeader {user} />
	<main class="min-h-0 flex-1 overflow-y-auto">
		<svelte:boundary>
			{@render children()}
			{#snippet pending()}<Spinner />{/snippet}
		</svelte:boundary>
	</main>
</div>
