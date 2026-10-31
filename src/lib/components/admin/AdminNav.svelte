<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Layers, Settings, Sprout, Users } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const links = $derived([
		{ href: resolve('/(app)/admin/users'), label: t`Users`, icon: Users },
		{ href: resolve('/(app)/admin/species'), label: t`Species`, icon: Sprout },
		{ href: resolve('/(app)/admin/maps'), label: t`Base maps`, icon: Layers },
		{ href: resolve('/(app)/admin/settings'), label: t`Settings`, icon: Settings }
	]);
</script>

<nav class="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200">
	{#each links as link (link.href)}
		{@const active = page.url.pathname === link.href}
		<a
			href={link.href}
			aria-current={active ? 'page' : undefined}
			class={[
				'-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4',
				active
					? 'border-leaf-600 text-leaf-800'
					: 'border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900'
			]}
		>
			<link.icon />
			{link.label}
		</a>
	{/each}
</nav>
