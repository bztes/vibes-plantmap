<script lang="ts">
	interface Props {
		label: string;
		value: string;
		hint?: string;
	}

	let { label, value, hint }: Props = $props();
</script>

<div class="rounded-lg bg-stone-50 px-3 py-2">
	<div class="text-xs text-stone-500">{label}</div>
	<div class="text-lg font-semibold text-stone-900 tabular-nums">{value}</div>
	{#if hint}<div class="text-xs text-stone-500">{hint}</div>{/if}
</div>
