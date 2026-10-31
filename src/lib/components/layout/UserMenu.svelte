<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { ChevronDown, LogOut, Shield } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { signOut } from '#lib/remote/auth.remote.ts';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';

	interface Props {
		user: { name: string; email: string; isAdmin: boolean };
	}

	let { user }: Props = $props();

	const item =
		'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:bg-stone-100 focus-visible:outline-none';

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
			class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
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
			<div class="border-b border-stone-100 px-2 py-2"><LocaleSwitcher /></div>
			{#if user.isAdmin}
				<div class="border-b border-stone-100 p-1">
					<a href={resolve('/(app)/admin')} role="menuitem" class={item} onclick={() => close()}>
						<Shield class="size-4" />
						{t`Admin panel`}
					</a>
				</div>
			{/if}
			<form {...signOut} class="p-1">
				<button type="submit" role="menuitem" class={item}>
					<LogOut class="size-4" />
					{t`Sign out`}
				</button>
			</form>
		</div>
	{/if}
</div>
