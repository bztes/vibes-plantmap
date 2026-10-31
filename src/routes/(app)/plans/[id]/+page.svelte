<script lang="ts">
	import type { PageProps } from './$types';
	import PlanView from '#lib/components/plan/PlanView.svelte';

	let { params }: PageProps = $props();
</script>

{#key params.id}<PlanView planRef={params.id} />{/key}
