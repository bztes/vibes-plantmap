<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { getSettings, updateSignupEnabled } from '#lib/remote/admin.remote.ts';
	import Card from '#lib/components/ui/Card.svelte';
	import Switch from '#lib/components/ui/Switch.svelte';

	const settings = $derived(await getSettings());
</script>

<Card class="flex items-center justify-between gap-6">
	<div>
		<h2 class="font-medium text-stone-900">{t`Allow sign ups`}</h2>
		<p class="text-sm text-stone-500">
			{t`When disabled, new people can't create an account. Existing users can still sign in.`}
		</p>
	</div>
	<Switch
		label={t`Allow sign ups`}
		checked={settings.signupEnabled}
		disabled={updateSignupEnabled.pending > 0}
		onchange={(enabled) => updateSignupEnabled(enabled)}
	/>
</Card>
