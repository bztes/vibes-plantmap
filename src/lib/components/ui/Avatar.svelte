<script lang="ts">
	interface Props {
		name: string;
		class?: string;
	}

	let { name, class: className }: Props = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0].toUpperCase())
			.join('')
	);
</script>

<span
	class={[
		'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-xs font-semibold text-leaf-800',
		className
	]}
	aria-hidden="true"
>
	{initials || '?'}
</span>
