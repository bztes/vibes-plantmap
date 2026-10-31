<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';
	import Logo from './Logo.svelte';

	interface Props {
		title: string;
		description: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, description, children, footer }: Props = $props();
</script>

<div
	class="flex min-h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-leaf-100),transparent_50%),radial-gradient(circle_at_80%_90%,var(--color-amber-50),transparent_40%)] px-4 py-12"
>
	<div class="w-full max-w-sm">
		<div class="mb-8 flex justify-center"><Logo /></div>
		<Card padding="lg">
			<h1 class="text-xl font-semibold text-stone-900">{title}</h1>
			<p class="mt-1 mb-6 text-sm text-stone-500">{description}</p>
			{@render children()}
		</Card>
		{#if footer}<div class="mt-6 text-center text-sm text-stone-600">{@render footer()}</div>{/if}
		<div class="mt-4 flex justify-center"><LocaleSwitcher /></div>
	</div>
</div>
