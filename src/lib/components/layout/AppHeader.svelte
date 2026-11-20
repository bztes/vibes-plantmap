<script lang="ts">
	import { t } from '@bztes/vibes-t0n';
	import { LogIn } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';
	import Logo from './Logo.svelte';
	import UserMenu, { type MenuAction } from './UserMenu.svelte';

	interface Props {
		/** null on shared plans opened while signed out */
		user: { name: string; email: string; isAdmin: boolean } | null;
		/** shown next to the logo, e.g. the plan name */
		title?: Snippet;
		/** extra entries at the top of the user menu for the current page */
		actions?: MenuAction[];
	}

	let { user, title, actions = [] }: Props = $props();
</script>

<header class="z-20 shrink-0 border-b border-stone-200 bg-white/90 backdrop-blur">
	<div class="flex h-14 items-center gap-3 px-4">
		<Logo compact={!!title} />
		{#if title}
			<div class="h-6 w-px shrink-0 bg-stone-200" aria-hidden="true"></div>
			<div class="min-w-0 flex-1">{@render title()}</div>
		{/if}
		{#if user}
			<div class="ml-auto shrink-0"><UserMenu {user} {actions} /></div>
		{:else}
			<Button
				class="ml-auto"
				size="sm"
				variant="outline"
				href={`${resolve('/(auth)/login')}?next=${encodeURIComponent(page.url.pathname)}`}
			>
				<LogIn />
				{t`Sign in`}
			</Button>
		{/if}
	</div>
</header>
