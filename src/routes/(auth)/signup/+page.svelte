<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getSignupState, signUp } from '#lib/remote/auth.remote.ts';
	import AuthCard from '#lib/components/layout/AuthCard.svelte';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Alert from '#lib/components/ui/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	const next = $derived(page.url.searchParams.get('next'));
	// keep where to continue to when switching between sign in and sign up
	const loginHref = $derived(
		resolve('/(auth)/login') + (next ? `?next=${encodeURIComponent(next)}` : '')
	);

	const signup = $derived(await getSignupState());
</script>

<svelte:head><title>{t`Sign up`} · Plantmap</title></svelte:head>

<AuthCard title={t`Create an account`} description={t`Plan where your trees go before you dig.`}>
	{#if !signup.enabled}
		<Alert tone="warning">
			{t`Sign up is currently disabled. Ask an administrator to create an account for you.`}
		</Alert>
	{:else}
		<form {...signUp} class="flex flex-col gap-4">
			{#if signup.firstUser}
				<Alert tone="info">{t`This is the first account, it will get administrator rights.`}</Alert>
			{/if}
			<FormIssues issues={signUp.fields.issues()} />
			{#if next}<input {...signUp.fields.next.as('hidden', next)} />{/if}
			<Field label={t`Name`} for="name" issues={signUp.fields.name.issues()}>
				<Input id="name" autocomplete="name" {...signUp.fields.name.as('text')} />
			</Field>
			<Field label={t`Email`} for="email" issues={signUp.fields.email.issues()}>
				<Input id="email" autocomplete="email" {...signUp.fields.email.as('email')} />
			</Field>
			<Field
				label={t`Password`}
				for="password"
				hint={t`At least 8 characters`}
				issues={signUp.fields._password.issues()}
			>
				<Input
					id="password"
					autocomplete="new-password"
					{...signUp.fields._password.as('password')}
				/>
			</Field>
			<Button type="submit" block loading={!!signUp.pending}>{t`Create account`}</Button>
		</form>
	{/if}
	{#snippet footer()}
		{t`Already have an account?`}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve()d path plus query -->
		<a href={loginHref} class="font-medium text-leaf-700 hover:underline">{t`Sign in`}</a>
	{/snippet}
</AuthCard>
