<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { Check, Copy, Eye, Link, Pencil, Trash2 } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { createPlanShare, deletePlanShare, getPlanShares } from '#lib/remote/shares.remote.ts';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';
	import Spinner from '#lib/components/ui/Spinner.svelte';
	import Dialog from '#lib/components/ui/Dialog.svelte';

	interface Props {
		open: boolean;
		planId: string;
	}

	let { open = $bindable(), planId }: Props = $props();

	let role = $state<'view' | 'edit'>('view');
	/** token of the link that was just copied */
	let copied = $state<string | null>(null);
	let copiedTimer: ReturnType<typeof setTimeout>;

	const linkUrl = (token: string) => page.url.origin + resolve('/(share)/s/[token]', { token });

	async function copy(token: string) {
		await navigator.clipboard.writeText(linkUrl(token));
		copied = token;
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied = null), 2000);
	}
</script>

<Dialog
	bind:open
	title={t`Share plan`}
	description={t`Anyone with a view link can look at this plan, no account needed. Edit links let signed in people add, move and change trees.`}
>
	<div class="flex flex-col gap-5">
		<svelte:boundary>
			{@const shares = await getPlanShares(planId)}
			{#if shares.length === 0}
				<p class="flex items-center gap-2 text-sm text-stone-500">
					<Link class="size-4 shrink-0" />
					{t`This plan isn't shared yet.`}
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each shares as share (share.token)}
						<li class="flex items-center gap-2">
							{#if share.role === 'edit'}
								<Badge tone="green" class="w-20 justify-center"><Pencil /> {t`Can edit`}</Badge>
							{:else}
								<Badge class="w-20 justify-center"><Eye /> {t`View only`}</Badge>
							{/if}
							<Input
								size="sm"
								readonly
								value={linkUrl(share.token)}
								aria-label={t`Share link`}
								onfocus={(e) => e.currentTarget.select()}
							/>
							<IconButton label={t`Copy link`} small onclick={() => copy(share.token)}>
								{#if copied === share.token}<Check class="text-leaf-600" />{:else}<Copy />{/if}
							</IconButton>
							<IconButton
								label={t`Revoke link`}
								small
								variant="danger-ghost"
								onclick={() => deletePlanShare(share.token)}
							>
								<Trash2 />
							</IconButton>
						</li>
					{/each}
				</ul>
			{/if}
			{#snippet pending()}<Spinner />{/snippet}
		</svelte:boundary>

		<div class="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
			<SegmentedControl
				label={t`Access`}
				bind:value={role}
				options={[
					{ value: 'view', label: t`View only`, icon: Eye },
					{ value: 'edit', label: t`Can edit`, icon: Pencil }
				]}
			/>
			<Button
				size="sm"
				class="ml-auto"
				loading={createPlanShare.pending > 0}
				onclick={() => createPlanShare({ planId, role })}
			>
				<Link />
				{t`Create link`}
			</Button>
		</div>
	</div>
</Dialog>
