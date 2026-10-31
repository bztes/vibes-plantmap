<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'type'> & { value?: number };

	let { value = $bindable(0), class: className, ...rest }: Props = $props();
</script>

<input type="range" class={['slider w-full', className]} bind:value {...rest} />

<style>
	.slider {
		appearance: none;
		height: 6px;
		border-radius: 9999px;
		background: var(--color-stone-200);
		cursor: pointer;
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 9999px;
		background: var(--color-leaf-600);
		border: 3px solid white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
	}
	.slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 9999px;
		background: var(--color-leaf-600);
		border: 3px solid white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
	}
	.slider:focus-visible {
		outline: 2px solid var(--color-leaf-500);
		outline-offset: 4px;
	}
</style>
