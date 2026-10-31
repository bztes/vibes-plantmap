<script lang="ts">
	import { localeNames, locales, t } from '#lib/i18n/index.ts';
	import { setSpeciesTranslations } from '#lib/remote/species.remote.ts';
	import Alert from '#lib/components/ui/Alert.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	interface Props {
		open: boolean;
		species: { id: string; baseName: string; nameTranslations: Record<string, string> };
	}

	let { open = $bindable(), species }: Props = $props();

	let names = $state<Record<string, string>>({});
	let saving = $state(false);
	let error = $state('');
	const formId = $derived(`species-names-${species.id}`);

	// start from the stored names every time the dialog opens
	$effect.pre(() => {
		if (open) {
			names = Object.fromEntries(locales.map((l) => [l, species.nameTranslations[l] ?? '']));
			error = '';
		}
	});

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';
		try {
			await setSpeciesTranslations({ id: species.id, translations: names });
			open = false;
		} catch (e) {
			error = (e as { body?: { message?: string } }).body?.message ?? t`Could not save`;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	title={t`Translate “${species.baseName}”`}
	description={t`Shown instead of the name in the chosen language. Leave empty to use the name.`}
>
	<form id={formId} onsubmit={save} class="flex flex-col gap-4">
		{#if error}<Alert tone="error">{error}</Alert>{/if}
		{#each locales as locale (locale)}
			<Field label={localeNames[locale]} for="{formId}-{locale}">
				<Input
					id="{formId}-{locale}"
					lang={locale}
					maxlength={80}
					placeholder={species.baseName}
					value={names[locale]}
					oninput={(e) => (names[locale] = e.currentTarget.value)}
				/>
			</Field>
		{/each}
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form={formId} loading={saving}>{t`Save`}</Button>
	{/snippet}
</Dialog>
