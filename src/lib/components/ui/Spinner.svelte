<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { LoaderCircle } from '@lucide/svelte';

	let { label }: { label?: string } = $props();
</script>

<div class="flex items-center justify-center gap-2 p-8 text-sm text-stone-500" role="status">
	<LoaderCircle class="size-5 animate-spin" />
	{label ?? t`Loading…`}
</div>
