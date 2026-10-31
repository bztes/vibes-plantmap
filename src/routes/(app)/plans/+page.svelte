<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Map, Plus } from '@lucide/svelte';
	import { getPlans } from '#lib/remote/plans.remote.ts';
	import PageContainer from '#lib/components/layout/PageContainer.svelte';
	import CreatePlanDialog from '#lib/components/plans/CreatePlanDialog.svelte';
	import PlanCard from '#lib/components/plans/PlanCard.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';

	const plans = $derived(await getPlans());
	let creating = $state(false);
</script>

<svelte:head><title>{t`Plans`} · Plantmap</title></svelte:head>

<PageContainer>
	<PageHeader
		title={t`Your plans`}
		description={t`Each plan is a map with trees you want to plant.`}
	>
		{#snippet actions()}
			<Button onclick={() => (creating = true)}><Plus /> {t`New plan`}</Button>
		{/snippet}
	</PageHeader>

	{#if plans.length === 0}
		<EmptyState
			icon={Map}
			title={t`No plans yet`}
			description={t`Create a plan, place trees on the map and see how much room they need as they grow.`}
		>
			<Button onclick={() => (creating = true)}><Plus /> {t`Create your first plan`}</Button>
		</EmptyState>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each plans as plan (plan.id)}
				<PlanCard {plan} />
			{/each}
		</div>
	{/if}
</PageContainer>

<CreatePlanDialog bind:open={creating} />
