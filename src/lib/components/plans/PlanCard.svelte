<script lang="ts">
	import { Trash2, TreeDeciduous } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { getLocale, t } from '#lib/i18n/index.ts';
	import { deletePlan } from '#lib/remote/plans.remote.ts';
	import Card from '#lib/components/ui/Card.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';

	interface Props {
		plan: {
			id: string;
			name: string;
			description: string | null;
			treeCount: number;
			createdAt: Date;
		};
	}

	let { plan }: Props = $props();
	let confirming = $state(false);
</script>

<Card interactive class="group relative flex flex-col gap-3">
	<div class="flex items-start justify-between gap-2">
		<a
			href={resolve('/(app)/plans/[id]', { id: plan.id })}
			class="font-semibold text-stone-900 after:absolute after:inset-0"
		>
			{plan.name}
		</a>
		<IconButton
			small
			label={t`Delete plan`}
			variant="danger-ghost"
			class="relative z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
			onclick={() => (confirming = true)}
		>
			<Trash2 />
		</IconButton>
	</div>
	{#if plan.description}
		<p class="line-clamp-2 text-sm text-stone-500">{plan.description}</p>
	{/if}
	<div class="mt-auto flex items-center justify-between text-xs text-stone-500">
		<span class="flex items-center gap-1">
			<TreeDeciduous class="size-3.5" />
			{plan.treeCount === 1 ? t`1 tree` : t`${plan.treeCount} trees`}
		</span>
		<span>{plan.createdAt.toLocaleDateString(getLocale())}</span>
	</div>
</Card>

<ConfirmDialog
	bind:open={confirming}
	title={t`Delete plan?`}
	message={t`“${plan.name}” and all of its trees will be removed permanently.`}
	onconfirm={() => deletePlan(plan.id)}
/>
