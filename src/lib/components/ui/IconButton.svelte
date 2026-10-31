<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { button, type ButtonVariants } from './Button.svelte';

	type Props = HTMLButtonAttributes &
		Pick<ButtonVariants, 'variant'> & { label: string; small?: boolean };

	let {
		label,
		variant = 'ghost',
		small = false,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<button
	type="button"
	aria-label={label}
	title={label}
	class={button({ variant, size: small ? 'icon-sm' : 'icon', class: className as string })}
	{...rest}
>
	{@render children?.()}
</button>
