<script lang="ts">
	import { Trees } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	interface Props {
		/** hides the name on small screens to leave room for a page title */
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
</script>

<a
	href={resolve('/')}
	aria-label="Plantmap"
	class="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-stone-900"
>
	<span class="flex size-8 items-center justify-center rounded-lg bg-leaf-600 text-white">
		<Trees class="size-5" />
	</span>
	<span class={[compact && 'max-md:hidden']}>Plantmap</span>
</a>
