<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const button = tv({
		base: 'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors select-none focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
		variants: {
			variant: {
				primary: 'bg-leaf-600 text-white shadow-sm hover:bg-leaf-700',
				secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200',
				outline: 'border border-stone-300 bg-white text-stone-800 shadow-sm hover:bg-stone-50',
				ghost: 'text-stone-700 hover:bg-stone-100',
				danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
				'danger-ghost': 'text-red-600 hover:bg-red-50'
			},
			size: {
				sm: 'h-8 px-3 text-sm',
				md: 'h-10 px-4 text-sm',
				lg: 'h-12 px-6 text-base',
				icon: 'size-9',
				'icon-sm': 'size-7 rounded-md'
			},
			block: { true: 'w-full' }
		},
		defaultVariants: { variant: 'primary', size: 'md' }
	});

	export type ButtonVariants = VariantProps<typeof button>;
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { LoaderCircle } from '@lucide/svelte';

	type Props = ButtonVariants & { loading?: boolean } & (
			(HTMLButtonAttributes & { href?: undefined }) | (HTMLAnchorAttributes & { href: string })
		);

	let {
		variant,
		size,
		block,
		loading = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const classes = $derived(button({ variant, size, block, class: className as string }));
</script>

{#if rest.href !== undefined}
	<a class={classes} {...rest as HTMLAnchorAttributes}>{@render children?.()}</a>
{:else}
	<button
		class={classes}
		type="button"
		{...rest as HTMLButtonAttributes}
		disabled={(rest as HTMLButtonAttributes).disabled || loading}
	>
		{#if loading}<LoaderCircle class="animate-spin" />{/if}
		{@render children?.()}
	</button>
{/if}
