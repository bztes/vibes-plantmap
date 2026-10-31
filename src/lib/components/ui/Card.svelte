<script lang="ts" module>
	import { tv } from 'tailwind-variants';

	export const card = tv({
		base: 'rounded-xl border border-stone-200 bg-white shadow-sm',
		variants: {
			padding: { none: '', md: 'p-5', lg: 'p-8' },
			interactive: { true: 'transition hover:border-leaf-300 hover:shadow-md' }
		},
		defaultVariants: { padding: 'md' }
	});
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { VariantProps } from 'tailwind-variants';

	type Props = HTMLAttributes<HTMLDivElement> & VariantProps<typeof card>;

	let { padding, interactive, class: className, children, ...rest }: Props = $props();
</script>

<div class={card({ padding, interactive, class: className as string })} {...rest}>
	{@render children?.()}
</div>
