<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import { getUsers } from '#lib/remote/admin.remote.ts';
	import { getCurrentUser } from '#lib/remote/auth.remote.ts';
	import UserRow from '#lib/components/admin/UserRow.svelte';
	import Table from '#lib/components/ui/Table.svelte';

	const users = $derived(await getUsers());
	const me = $derived(await getCurrentUser());
</script>

<svelte:head><title>{t`Users`} · {t`Admin`} · Plantmap</title></svelte:head>

<section>
	<h2 class="mb-3 font-medium text-stone-900">{t`Users (${users.length})`}</h2>
	<Table columns={[t`User`, t`Role`, t`Plans`, t`Joined`, '']}>
		{#each users as user (user.id)}
			<UserRow {user} isSelf={user.id === me?.id} />
		{/each}
	</Table>
</section>
