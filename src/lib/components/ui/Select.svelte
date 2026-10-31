<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { control } from './input';

	type Props = Omit<HTMLSelectAttributes, 'size'> & { size?: 'sm' | 'md' };

	let { size, class: className, children, ...rest }: Props = $props();
</script>

<div class={['relative', className]}>
	<select class={control({ size, class: 'appearance-none pr-9' })} {...rest}>
		{@render children?.()}
	</select>
	<ChevronDown
		class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone-500"
	/>
</div>
