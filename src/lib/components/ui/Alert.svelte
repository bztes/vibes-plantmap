<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const alert = tv({
		base: 'flex gap-3 rounded-lg border p-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0',
		variants: {
			tone: {
				info: 'border-sky-200 bg-sky-50 text-sky-900',
				success: 'border-leaf-200 bg-leaf-50 text-leaf-900',
				warning: 'border-amber-200 bg-amber-50 text-amber-900',
				error: 'border-red-200 bg-red-50 text-red-900'
			}
		},
		defaultVariants: { tone: 'info' }
	});
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CircleAlert, CircleCheck, Info, TriangleAlert } from '@lucide/svelte';

	type Props = VariantProps<typeof alert> & { class?: string; children: Snippet };

	let { tone = 'info', class: className, children }: Props = $props();

	const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };
	const Icon = $derived(icons[tone]);
</script>

<div role={tone === 'error' ? 'alert' : 'status'} class={alert({ tone, class: className })}>
	<Icon />
	<div class="min-w-0 flex-1">{@render children()}</div>
</div>
