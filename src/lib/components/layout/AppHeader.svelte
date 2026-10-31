<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { LogIn, Map, Shield, Sprout } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/Button.svelte';
	import Logo from './Logo.svelte';
	import NavLink from './NavLink.svelte';
	import UserMenu from './UserMenu.svelte';

	interface Props {
		/** null on shared plans opened while signed out */
		user: { name: string; email: string; isAdmin: boolean } | null;
	}

	let { user }: Props = $props();
</script>

<header class="z-20 shrink-0 border-b border-stone-200 bg-white/90 backdrop-blur">
	<div class="flex h-14 items-center gap-4 px-4">
		<Logo />
		{#if user}
			<nav class="ml-4 flex items-center gap-1">
				<NavLink href={resolve('/(app)/plans')} label={t`Plans`} icon={Map} />
				<NavLink href={resolve('/(app)/species')} label={t`Species`} icon={Sprout} />
				{#if user.isAdmin}<NavLink
						href={resolve('/(app)/admin')}
						label={t`Admin`}
						icon={Shield}
					/>{/if}
			</nav>
			<div class="ml-auto"><UserMenu {user} /></div>
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
