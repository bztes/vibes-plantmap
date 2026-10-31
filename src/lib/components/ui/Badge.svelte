<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badge = tv({
		base: 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3',
		variants: {
			tone: {
				neutral: 'bg-stone-100 text-stone-700',
				green: 'bg-leaf-100 text-leaf-800',
				amber: 'bg-amber-100 text-amber-800',
				red: 'bg-red-100 text-red-700',
				blue: 'bg-sky-100 text-sky-800'
			}
		},
		defaultVariants: { tone: 'neutral' }
	});
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>;

	let { tone, class: className, children, ...rest }: Props = $props();
</script>

<span class={badge({ tone, class: className as string })} {...rest}>{@render children?.()}</span>
