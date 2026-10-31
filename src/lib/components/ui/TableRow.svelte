<script lang="ts">
	import type { Snippet } from 'svelte';
	import { table } from './table';

	let { children }: { children: Snippet } = $props();
</script>

<tr class={table().row()}>{@render children()}</tr>
