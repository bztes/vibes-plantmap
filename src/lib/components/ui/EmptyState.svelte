<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component;
		title: string;
		description?: string;
		children?: Snippet;
	}

	let { icon: Icon, title, description, children }: Props = $props();
</script>

<div
	class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center"
>
	<div class="flex size-12 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
		<Icon class="size-6" />
	</div>
	<div>
		<h3 class="font-semibold text-stone-900">{title}</h3>
		{#if description}<p class="mt-1 max-w-sm text-sm text-stone-500">{description}</p>{/if}
	</div>
	{@render children?.()}
</div>
