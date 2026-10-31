<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { LocateFixed } from '@lucide/svelte';
	import { createPlan } from '#lib/remote/plans.remote.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';

	let { open = $bindable() }: { open: boolean } = $props();

	// central Europe overview until the user shares a location or searches on the map
	let location = $state({ lng: 10.45, lat: 51.16, zoom: 5, label: '' });
	let locating = $state(false);

	function locate() {
		locating = true;
		navigator.geolocation.getCurrentPosition(
			({ coords }) => {
				location = {
					lng: coords.longitude,
					lat: coords.latitude,
					zoom: 18,
					label: t`Your location`
				};
				locating = false;
			},
			() => {
				location.label = t`Location unavailable, you can search on the map later`;
				locating = false;
			}
		);
	}
</script>

<Dialog
	bind:open
	title={t`New plan`}
	description={t`A plan is one area, like your garden or orchard.`}
>
	<form {...createPlan} id="create-plan" class="flex flex-col gap-4">
		<FormIssues issues={createPlan.fields.issues()} />
		<Field label={t`Name`} for="plan-name" issues={createPlan.fields.name.issues()}>
			<Input id="plan-name" placeholder={t`Backyard`} {...createPlan.fields.name.as('text')} />
		</Field>
		<Field label={t`Description`} for="plan-description" hint={t`Optional`}>
			<Textarea id="plan-description" rows={2} {...createPlan.fields.description.as('text')} />
		</Field>
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" loading={locating} onclick={locate}>
				<LocateFixed />
				{t`Start at my location`}
			</Button>
			{#if location.label}<span class="text-xs text-stone-500">{location.label}</span>{/if}
		</div>
		<input {...createPlan.fields.centerLng.as('hidden', location.lng)} />
		<input {...createPlan.fields.centerLat.as('hidden', location.lat)} />
		<input {...createPlan.fields.zoom.as('hidden', location.zoom)} />
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="create-plan" loading={!!createPlan.pending}>{t`Create plan`}</Button
		>
	{/snippet}
</Dialog>
