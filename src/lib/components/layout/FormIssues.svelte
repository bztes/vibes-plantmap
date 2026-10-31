<script lang="ts">
	import Alert from '#lib/components/ui/Alert.svelte';

	let { issues }: { issues: { message: string }[] | undefined } = $props();
</script>

{#if issues?.length}
	<Alert tone="error">
		{#each issues as issue (issue.message)}<p>{issue.message}</p>{/each}
	</Alert>
{/if}
