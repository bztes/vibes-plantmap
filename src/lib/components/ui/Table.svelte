<script lang="ts">
	import type { Snippet } from 'svelte';
	import { table } from './table';

	interface Props {
		columns: string[];
		children: Snippet;
	}

	let { columns, children }: Props = $props();
	const styles = table();
</script>

<div class={styles.wrapper()}>
	<table class={styles.root()}>
		<thead class={styles.head()}>
			<tr>
				{#each columns as column (column)}
					<th class={styles.th()}>{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>{@render children()}</tbody>
	</table>
</div>
