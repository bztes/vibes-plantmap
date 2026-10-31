<script lang="ts">
	import type { Snippet } from 'svelte';
	import { table } from './table';

	let { class: className, children }: { class?: string; children: Snippet } = $props();
</script>

<td class={table().td({ class: className })}>{@render children()}</td>
