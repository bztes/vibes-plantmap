<script lang="ts">
	import { Trees } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<a href={resolve('/')} class="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
	<span class="flex size-8 items-center justify-center rounded-lg bg-leaf-600 text-white">
		<Trees class="size-5" />
	</span>
	Plantmap
</a>
