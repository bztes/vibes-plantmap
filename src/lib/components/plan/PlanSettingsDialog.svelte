<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { updatePlan } from '#lib/remote/plans.remote.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';

	interface Props {
		open: boolean;
		plan: { id: string; name: string; description: string | null };
	}

	let { open = $bindable(), plan }: Props = $props();

	const form = $derived(updatePlan.for(plan.id));
</script>

<Dialog bind:open title={t`Plan settings`}>
	<form
		{...form.enhance(async ({ submit }) => {
			if (await submit()) open = false;
		})}
		id="plan-settings"
		class="flex flex-col gap-4"
	>
		<FormIssues issues={form.fields.issues()} />
		<input {...form.fields.id.as('hidden', plan.id)} />
		<Field label={t`Name`} for="plan-name" issues={form.fields.name.issues()}>
			<Input id="plan-name" {...form.fields.name.as('text', plan.name)} />
		</Field>
		<Field label={t`Description`} for="plan-description">
			<Textarea
				id="plan-description"
				rows={3}
				{...form.fields.description.as('text', plan.description ?? '')}
			/>
		</Field>
	</form>
	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>{t`Cancel`}</Button>
		<Button type="submit" form="plan-settings" loading={!!form.pending}>{t`Save`}</Button>
	{/snippet}
</Dialog>
