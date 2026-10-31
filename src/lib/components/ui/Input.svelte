<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { control } from './input';

	type Props = Omit<HTMLInputAttributes, 'size'> & { size?: 'sm' | 'md' };

	let { size, class: className, ...rest }: Props = $props();
</script>

<input class={control({ size, class: className as string })} {...rest} />
