<script lang="ts">
	import { getLocale, t } from '@bztes/vibes-t0n';
	import { Plus, X } from '@lucide/svelte';
	import { addMeasurement, deleteMeasurement, type TreeRow } from '#lib/remote/trees.remote.ts';
	import { formatMeters } from '#lib/growth.ts';
	import FormIssues from '#lib/components/layout/FormIssues.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Field from '#lib/components/ui/Field.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Input from '#lib/components/ui/Input.svelte';

	interface Props {
		tree: TreeRow;
		/** plan id or share link token, see `getPlanAccess` */
		planRef: string;
		editable: boolean;
		/** whether the form for a new measurement is open */
		adding?: boolean;
	}

	let { tree, planRef, editable, adding = $bindable(false) }: Props = $props();

	const form = $derived(addMeasurement.for(tree.id));
	const f = $derived(form.fields);
	const today = new Date().toISOString().slice(0, 10);
	const newestFirst = $derived(tree.measurements.toReversed());

	const formatDate = (date: string) =>
		new Date(date).toLocaleDateString(getLocale(), { dateStyle: 'medium', timeZone: 'UTC' });
	const meters = (value: number | null) => (value === null ? '–' : formatMeters(value));
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-2">
		<h3 class="flex-1 text-sm font-medium text-stone-700">{t`Measurements`}</h3>
		{#if editable && !adding}
			<Button size="sm" variant="ghost" class="-mr-2 text-leaf-700" onclick={() => (adding = true)}>
				<Plus />
				{t`Log`}
			</Button>
		{/if}
	</div>

	{#if editable && adding}
		<form
			{...form.enhance(async ({ element, submit }) => {
				if (await submit()) {
					element.reset();
					adding = false;
				}
			})}
			class="flex flex-col gap-2 rounded-lg border border-leaf-200 bg-leaf-50 p-3"
		>
			<FormIssues issues={f.issues()} />
			<input {...f.treeId.as('hidden', tree.id)} />
			<input {...f.planRef.as('hidden', planRef)} />
			<div class="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
				<Field label={t`Measured on`} for="m-date" issues={f.measuredAt.issues()}>
					<Input id="m-date" size="sm" max={today} {...f.measuredAt.as('date', today)} />
				</Field>
				<Field label={t`Height (m)`} for="m-height">
					<Input
						id="m-height"
						size="sm"
						step="0.1"
						min="0.1"
						{@attach (el) => el.focus()}
						{...f.height.as('number')}
					/>
				</Field>
				<Field label={t`Crown (m)`} for="m-spread" issues={f.spread.issues()}>
					<Input id="m-spread" size="sm" step="0.1" min="0.1" {...f.spread.as('number')} />
				</Field>
			</div>
			{#each f.height.issues() ?? [] as issue (issue.message)}
				<p class="text-xs text-red-600">{issue.message}</p>
			{/each}
			<div class="flex justify-end gap-2">
				<Button size="sm" variant="ghost" onclick={() => (adding = false)}>{t`Cancel`}</Button>
				<Button type="submit" size="sm" loading={!!form.pending}>{t`Save measurement`}</Button>
			</div>
		</form>
	{/if}

	{#if newestFirst.length}
		<table class="w-full text-sm">
			<thead class="text-left text-xs text-stone-500">
				<tr>
					<th class="pb-1 font-normal">{t`Date`}</th>
					<th class="pb-1 text-right font-normal">{t`Height`}</th>
					<th class="pb-1 text-right font-normal">{t`Crown width`}</th>
					{#if editable}<th class="w-8"><span class="sr-only">{t`Actions`}</span></th>{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-stone-100">
				{#each newestFirst as m (m.id)}
					{@const date = formatDate(m.measuredAt)}
					<tr>
						<td class="py-1 text-stone-900">{date}</td>
						<td class="py-1 text-right text-stone-900 tabular-nums">{meters(m.height)}</td>
						<td class="py-1 text-right text-stone-900 tabular-nums">{meters(m.spread)}</td>
						{#if editable}
							<td class="py-1 pl-1 text-right">
								<!-- the first measurement is where the curve starts, so one has to stay -->
								{#if newestFirst.length > 1}
									<IconButton
										small
										label={t`Delete measurement from ${date}`}
										onclick={() => deleteMeasurement({ id: m.id, treeId: tree.id, planRef })}
									>
										<X />
									</IconButton>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if !editable}
		<p class="text-sm text-stone-500">{t`No measurements yet.`}</p>
	{/if}
</div>
