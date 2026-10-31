<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';

	interface Props {
		/** an already resolve()d path */
		href: string;
		label: string;
		icon: Component;
	}

	let { href, label, icon: Icon }: Props = $props();

	const active = $derived(page.url.pathname === href || page.url.pathname.startsWith(href + '/'));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass resolve()d paths -->
<a
	{href}
	aria-current={active ? 'page' : undefined}
	class={[
		'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
		active ? 'bg-leaf-50 text-leaf-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
	]}
>
	<Icon class="size-4" />
	<span class="hidden sm:inline">{label}</span>
</a>
