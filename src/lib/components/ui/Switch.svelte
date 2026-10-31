<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label: string;
		onchange?: (checked: boolean) => void;
	}

	let { checked = $bindable(false), disabled = false, label, onchange }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	class={[
		'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		checked ? 'bg-leaf-600' : 'bg-stone-300'
	]}
	onclick={() => {
		checked = !checked;
		onchange?.(checked);
	}}
>
	<span
		class={[
			'inline-block size-5 rounded-full bg-white shadow transition-transform',
			checked ? 'translate-x-5.5' : 'translate-x-0.5'
		]}
	></span>
</button>
