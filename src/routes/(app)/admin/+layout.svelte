<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import type { Snippet } from 'svelte';
	import AdminNav from '#lib/components/admin/AdminNav.svelte';
	import PageContainer from '#lib/components/layout/PageContainer.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<PageContainer>
	<PageHeader
		title={t`Administration`}
		description={t`Manage accounts, shared species, maps and who may join.`}
	/>
	<AdminNav />
	{@render children()}
</PageContainer>
