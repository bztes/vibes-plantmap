<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import { getLocale, localeNames, locales, setLocale } from '#lib/i18n/index.ts';
</script>

<div class="flex items-center gap-1 text-xs">
	{#each locales as locale (locale)}
		<button
			type="button"
			lang={locale}
			aria-pressed={getLocale() === locale}
			class={[
				'rounded-md px-2 py-1 transition-colors',
				getLocale() === locale
					? 'bg-leaf-50 font-medium text-leaf-800'
					: 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
			]}
			onclick={() => {
				setLocale(locale);
				// server data such as species names is localized too
				refreshAll();
			}}
		>
			{localeNames[locale]}
		</button>
	{/each}
</div>
