<script lang="ts">
	import { t } from '#lib/i18n/index.ts';
	import BasemapSettings from '#lib/components/admin/BasemapSettings.svelte';
</script>

<svelte:head><title>{t`Base maps`} · {t`Admin`} · Plantmap</title></svelte:head>

<BasemapSettings />
