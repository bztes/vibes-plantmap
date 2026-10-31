<script lang="ts">
	interface Props {
		color: string;
		class?: string;
	}

	let { color, class: className }: Props = $props();
</script>

<span
	class={['inline-block size-3 shrink-0 rounded-full ring-1 ring-black/10', className]}
	style:background-color={color}
	aria-hidden="true"
></span>
