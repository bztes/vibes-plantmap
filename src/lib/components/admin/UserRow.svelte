<script lang="ts">
	import { Ban, ShieldCheck, ShieldOff, Trash2, UserCheck } from '@lucide/svelte';
	import { getLocale, t } from '#lib/i18n/index.ts';
	import { deleteUser, setUserBanned, setUserRole } from '#lib/remote/admin.remote.ts';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import IconButton from '#lib/components/ui/IconButton.svelte';
	import TableCell from '#lib/components/ui/TableCell.svelte';
	import TableRow from '#lib/components/ui/TableRow.svelte';

	interface Props {
		user: {
			id: string;
			name: string;
			email: string;
			role: string | null;
			banned: boolean | null;
			createdAt: Date;
			planCount: number;
		};
		isSelf: boolean;
	}

	let { user, isSelf }: Props = $props();
	let confirmingDelete = $state(false);
	const isAdmin = $derived(user.role === 'admin');
</script>

<TableRow>
	<TableCell>
		<div class="flex items-center gap-3">
			<Avatar name={user.name} />
			<div>
				<div class="font-medium text-stone-900">
					{user.name}
					{#if isSelf}<span class="text-xs font-normal text-stone-500">{t`(you)`}</span>{/if}
				</div>
				<div class="text-xs text-stone-500">{user.email}</div>
			</div>
		</div>
	</TableCell>
	<TableCell>
		<div class="flex gap-1">
			{#if isAdmin}<Badge tone="green">{t`admin`}</Badge>{:else}<Badge>{t`user`}</Badge>{/if}
			{#if user.banned}<Badge tone="red">{t`deactivated`}</Badge>{/if}
		</div>
	</TableCell>
	<TableCell class="tabular-nums">{user.planCount}</TableCell>
	<TableCell>{user.createdAt.toLocaleDateString(getLocale())}</TableCell>
	<TableCell>
		{#if !isSelf}
			<div class="flex justify-end gap-1">
				<IconButton
					small
					label={isAdmin ? t`Remove admin rights` : t`Make admin`}
					onclick={() => setUserRole({ userId: user.id, role: isAdmin ? 'user' : 'admin' })}
				>
					{#if isAdmin}<ShieldOff />{:else}<ShieldCheck />{/if}
				</IconButton>
				<IconButton
					small
					label={user.banned ? t`Reactivate` : t`Deactivate`}
					onclick={() => setUserBanned({ userId: user.id, banned: !user.banned })}
				>
					{#if user.banned}<UserCheck />{:else}<Ban />{/if}
				</IconButton>
				<IconButton
					small
					variant="danger-ghost"
					label={t`Delete user`}
					onclick={() => (confirmingDelete = true)}
				>
					<Trash2 />
				</IconButton>
			</div>
		{/if}
	</TableCell>
</TableRow>

<ConfirmDialog
	bind:open={confirmingDelete}
	title={t`Delete user?`}
	message={t`${user.name} and all of their plans will be deleted permanently.`}
	onconfirm={() => deleteUser(user.id)}
/>
