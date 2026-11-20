<script lang="ts">
	import type { LayoutProps } from './$types';
	import Spinner from '#lib/components/ui/Spinner.svelte';

	let { children }: LayoutProps = $props();
</script>

<!-- the plan view renders the header, signed out visitors get a sign in button there -->
<main class="h-full">
	<svelte:boundary>
		{@render children()}
		{#snippet pending()}<Spinner />{/snippet}
	</svelte:boundary>
</main>
