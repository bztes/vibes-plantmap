<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { signIn } from '#lib/remote/auth.remote.ts';
	import AuthCard from '#lib/components/layout/AuthCard.svelte';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	const next = $derived(page.url.searchParams.get('next'));
	// keep where to continue to when switching between sign in and sign up
	const signupHref = $derived(
		resolve('/(auth)/signup') + (next ? `?next=${encodeURIComponent(next)}` : '')
	);
</script>

<svelte:head><title>{t`Sign in`} · Plantmap</title></svelte:head>

<AuthCard title={t`Welcome back`} description={t`Sign in to continue planning your trees.`}>
	<form {...signIn} class="flex flex-col gap-4">
		<FormIssues issues={signIn.fields.issues()} />
		{#if next}<input {...signIn.fields.next.as('hidden', next)} />{/if}
		<Field label={t`Email`} for="email" issues={signIn.fields.email.issues()}>
			<Input id="email" autocomplete="email" {...signIn.fields.email.as('email')} />
		</Field>
		<Field label={t`Password`} for="password" issues={signIn.fields._password.issues()}>
			<Input
				id="password"
				autocomplete="current-password"
				{...signIn.fields._password.as('password')}
			/>
		</Field>
		<Button type="submit" block loading={!!signIn.pending}>{t`Sign in`}</Button>
	</form>
	{#snippet footer()}
		{t`No account yet?`}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()d path plus query -->
		<a href={signupHref} class="font-medium text-leaf-700 hover:underline">{t`Sign up`}</a>
	{/snippet}
</AuthCard>
