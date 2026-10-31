<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { control } from './input';

	let { class: className, rows = 3, ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea
	class={control({ multiline: true, class: ['resize-y', className as string] })}
	{rows}
	{...rest}></textarea>
