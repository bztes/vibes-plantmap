<script lang="ts">
	import type { Snippet } from 'svelte';
	import Label from './Label.svelte';

	interface Props {
		label: string;
		/** id of the control, links the label to it */
		for?: string;
		hint?: string;
		issues?: { message: string }[];
		class?: string;
		children: Snippet;
	}

	let { label, for: htmlFor, hint, issues, class: className, children }: Props = $props();
</script>

<div class={['flex flex-col gap-1.5', className]}>
	<Label for={htmlFor}>{label}</Label>
	{@render children()}
	{#if issues?.length}
		{#each issues as issue (issue.message)}
			<p class="text-xs text-red-600">{issue.message}</p>
		{/each}
	{:else if hint}
		<p class="text-xs text-stone-500">{hint}</p>
	{/if}
</div>
