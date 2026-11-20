<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface MenuAction {
		label: string;
		icon: Component;
		onclick: () => void;
	}
</script>

<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { ChevronDown, LogOut, Map, Shield, Sprout } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { signOut } from '#lib/remote/auth.remote.ts';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';

	interface Props {
		user: { name: string; email: string; isAdmin: boolean };
		/** page specific entries shown above the navigation */
		actions?: MenuAction[];
	}

	let { user, actions = [] }: Props = $props();

	const item =
		'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:bg-stone-100 focus-visible:outline-none [&_svg]:size-4';

	const nav = $derived(
		[
			{ href: resolve('/(app)/plans'), label: t`Plans`, icon: Map },
			{ href: resolve('/(app)/species'), label: t`Species`, icon: Sprout },
			...(user.isAdmin ? [{ href: resolve('/(app)/admin'), label: t`Admin`, icon: Shield }] : [])
		].map((link) => ({
			...link,
			active: page.url.pathname === link.href || page.url.pathname.startsWith(link.href + '/')
		}))
	);

	let open = $state(false);
	let root: HTMLDivElement;
	let trigger: HTMLButtonElement;

	function close(refocus = false) {
		open = false;
		if (refocus) trigger.focus();
	}
</script>

<svelte:window
	onclick={(e) => open && !root.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && close(true)}
/>

<div bind:this={root} class="relative">
	<button
		bind:this={trigger}
		type="button"
		aria-label={t`User menu`}
		aria-haspopup="menu"
		aria-expanded={open}
		class="flex items-center gap-1 rounded-full p-0.5 pr-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:outline-none"
		onclick={() => (open = !open)}
	>
		<Avatar name={user.name} />
		<ChevronDown class={['size-4 transition-transform', open && 'rotate-180']} />
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
		>
			<div class="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
				<Avatar name={user.name} />
				<div class="min-w-0">
					<div class="flex items-center gap-1.5 text-sm font-medium text-stone-900">
						<span class="truncate">{user.name}</span>
						{#if user.isAdmin}<Badge tone="green">{t`admin`}</Badge>{/if}
					</div>
					<div class="truncate text-xs text-stone-500">{user.email}</div>
				</div>
			</div>
			{#if actions.length > 0}
				<div class="border-b border-stone-100 p-1">
					{#each actions as action (action.label)}
						<button
							type="button"
							role="menuitem"
							class={item}
							onclick={() => {
								close();
								action.onclick();
							}}
						>
							<action.icon />
							{action.label}
						</button>
					{/each}
				</div>
			{/if}
			<nav class="border-b border-stone-100 p-1">
				{#each nav as link (link.href)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()d above -->
					<a
						href={link.href}
						role="menuitem"
						aria-current={link.active ? 'page' : undefined}
						class={[item, link.active && 'bg-leaf-50 font-medium text-leaf-800']}
						onclick={() => close()}
					>
						<link.icon />
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="border-b border-stone-100 px-2 py-2"><LocaleSwitcher /></div>
			<form {...signOut} class="p-1">
				<button type="submit" role="menuitem" class={item}>
					<LogOut />
					{t`Sign out`}
				</button>
			</form>
		</div>
	{/if}
</div>
