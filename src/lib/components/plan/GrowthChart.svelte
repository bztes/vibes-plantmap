<script lang="ts">
	import { getLocale, t } from '@bztes/vibes-t0n';
	import {
		addYears,
		dimensionAt,
		formatMeters,
		type Dimension,
		type GrowthParams,
		type Measurement
	} from '#lib/growth.ts';
	import SegmentedControl from '#lib/components/ui/SegmentedControl.svelte';

	interface Props {
		tree: GrowthParams & { measurements: Measurement[] };
		/** date the map shows, marked on the chart */
		viewDate: Date;
	}

	let { tree, viewDate }: Props = $props();

	let dimension = $state<Dimension>('height');

	const HEIGHT = 168;
	const PAD = { top: 10, right: 12, bottom: 22, left: 40 };
	let width = $state(0);
	const plotWidth = $derived(Math.max(0, width - PAD.left - PAD.right));
	const plotHeight = HEIGHT - PAD.top - PAD.bottom;

	const measured = $derived(
		tree.measurements.flatMap((m) => {
			const value = m[dimension];
			return value === null ? [] : [{ date: new Date(m.measuredAt), value }];
		})
	);
	const pace = $derived(dimension === 'height' ? tree.heightPace : tree.spreadPace);
	/** the fitted curve only gets its own line when later measurements moved it */
	const adjusted = $derived(Math.abs((pace ?? 1) - 1) > 0.005);
	const mature = $derived(dimension === 'height' ? tree.matureHeight : tree.matureSpread);

	/** where this size's curve starts, the first measurement of it */
	const curveStart = $derived(
		new Date((dimension === 'height' ? tree.heightStart : tree.spreadStart).date)
	);
	// both sizes share the time axis so switching between them keeps the dates in place
	const start = $derived(
		new Date(Math.min(Date.parse(tree.heightStart.date), Date.parse(tree.spreadStart.date)))
	);
	const end = $derived(
		new Date(
			Math.max(
				addYears(start, Math.max(5, tree.yearsToMaturity)).getTime(),
				viewDate.getTime(),
				...measured.map((m) => addYears(m.date, 1).getTime())
			)
		)
	);
	const yMax = $derived(Math.max(mature, ...measured.map((m) => m.value)) * 1.08);

	const x = (date: Date) =>
		PAD.left + ((date.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * plotWidth;
	const y = (value: number) => PAD.top + plotHeight - (value / yMax) * plotHeight;

	function valueAt(date: Date, withPace: boolean) {
		return dimensionAt(tree, dimension, date, withPace ? undefined : 1);
	}

	const SAMPLES = 80;
	function curve(withPace: boolean) {
		const from = curveStart.getTime();
		const to = end.getTime();
		let d = '';
		for (let i = 0; i <= SAMPLES; i++) {
			const date = new Date(from + ((to - from) * i) / SAMPLES);
			d += `${i ? 'L' : 'M'}${x(date).toFixed(1)},${y(valueAt(date, withPace)).toFixed(1)}`;
		}
		return d;
	}
	const typicalPath = $derived(plotWidth ? curve(false) : '');
	const treePath = $derived(plotWidth && adjusted ? curve(true) : '');

	const yTicks = $derived.by(() => {
		const step = [0.5, 1, 2, 5, 10, 20, 50].find((s) => yMax / s <= 5) ?? 100;
		return Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
	});
	const xTicks = $derived.by(() => {
		const first = start.getUTCFullYear() + 1;
		const last = end.getUTCFullYear();
		const span = last - first;
		const maxTicks = Math.max(2, Math.floor(plotWidth / 56));
		const step = [1, 2, 5, 10, 20, 50].find((s) => span / s < maxTicks) ?? 100;
		const ticks: number[] = [];
		for (let year = Math.ceil(first / step) * step; year <= last; year += step) ticks.push(year);
		return ticks;
	});

	const formatDate = (date: Date) =>
		date.toLocaleDateString(getLocale(), { dateStyle: 'medium', timeZone: 'UTC' });
	const percent = (value: number) =>
		value.toLocaleString(getLocale(), { style: 'percent', maximumFractionDigits: 0 });

	/** hovered date, snapped to a measurement when the pointer is close to one */
	let hover = $state.raw<{ date: Date; measurement?: { value: number } } | null>(null);
	function onpointermove(event: PointerEvent) {
		const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - rect.left;
		if (px < PAD.left || px > PAD.left + plotWidth) return (hover = null);
		const near = measured.find((m) => Math.abs(x(m.date) - px) < 8);
		if (near) return (hover = { date: near.date, measurement: near });
		const ratio = (px - PAD.left) / plotWidth;
		hover = { date: new Date(start.getTime() + ratio * (end.getTime() - start.getTime())) };
	}
	const hoverBeforeStart = $derived(hover && hover.date < curveStart);
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h3 class="text-sm font-medium text-stone-700">{t`Growth curve`}</h3>
		<SegmentedControl
			label={t`Shown size`}
			bind:value={dimension}
			options={[
				{ value: 'height', label: t`Height` },
				{ value: 'spread', label: t`Crown width` }
			]}
		/>
	</div>

	{#if adjusted}
		<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
			<li class="flex items-center gap-1.5">
				<span class="h-0.5 w-4 rounded-full bg-leaf-600"></span>{t`This tree`}
			</li>
			<li class="flex items-center gap-1.5">
				<span class="w-4 border-t-2 border-dashed border-stone-400"
				></span>{t`Typical for the species`}
			</li>
			<li class="flex items-center gap-1.5">
				<span class="size-2 rounded-full bg-leaf-800"></span>{t`Measured`}
			</li>
		</ul>
	{/if}

	<div class="relative" bind:clientWidth={width}>
		<svg
			{width}
			height={HEIGHT}
			class="block touch-pan-y select-none"
			role="img"
			aria-label={dimension === 'height' ? t`Height over time` : t`Crown width over time`}
			{onpointermove}
			onpointerleave={() => (hover = null)}
		>
			{#if plotWidth}
				<g class="text-[10px] text-stone-400">
					{#each yTicks as tick (tick)}
						<line
							x1={PAD.left}
							x2={PAD.left + plotWidth}
							y1={y(tick)}
							y2={y(tick)}
							class={tick === 0 ? 'stroke-stone-300' : 'stroke-stone-100'}
						/>
						<text x={PAD.left - 6} y={y(tick)} dy="0.32em" text-anchor="end" fill="currentColor">
							{Number.isInteger(tick) ? `${tick} m` : formatMeters(tick)}
						</text>
					{/each}
					{#each xTicks as year (year)}
						<text
							x={x(new Date(Date.UTC(year, 0, 1)))}
							y={HEIGHT - 6}
							text-anchor="middle"
							fill="currentColor"
						>
							{year}
						</text>
					{/each}
				</g>

				<!-- the date the map shows -->
				<line
					x1={x(viewDate)}
					x2={x(viewDate)}
					y1={PAD.top}
					y2={PAD.top + plotHeight}
					class="stroke-stone-300"
					stroke-dasharray="2 3"
				/>

				<path
					d={typicalPath}
					fill="none"
					stroke-width="2"
					stroke-linecap="round"
					class={adjusted ? 'stroke-stone-400' : 'stroke-leaf-600'}
					stroke-dasharray={adjusted ? '4 4' : undefined}
				/>
				{#if treePath}
					<path
						d={treePath}
						fill="none"
						stroke-width="2"
						stroke-linecap="round"
						class="stroke-leaf-600"
					/>
				{/if}

				{#if hover}
					<line
						x1={x(hover.date)}
						x2={x(hover.date)}
						y1={PAD.top}
						y2={PAD.top + plotHeight}
						class="stroke-stone-400"
					/>
				{/if}

				{#each measured as m, i (i)}
					<circle
						cx={x(m.date)}
						cy={y(m.value)}
						r={hover?.measurement === m ? 5 : 4}
						class="fill-leaf-800 stroke-white"
						stroke-width="2"
					/>
				{/each}
			{/if}
		</svg>

		{#if hover}
			<div
				class="pointer-events-none absolute top-1 z-10 rounded-lg border border-stone-200 bg-white/95 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
				style:left="{x(hover.date)}px"
				style:transform={x(hover.date) > width / 2
					? 'translateX(calc(-100% - 8px))'
					: 'translateX(8px)'}
			>
				<p class="font-medium text-stone-900">{formatDate(hover.date)}</p>
				{#if hover.measurement}
					<p class="text-stone-600">
						{t`Measured`}
						<span class="font-medium text-stone-900 tabular-nums">
							{formatMeters(hover.measurement.value)}
						</span>
					</p>
				{/if}
				{#if !hoverBeforeStart}
					{#if adjusted}
						<p class="text-stone-600">
							{t`This tree`}
							<span class="font-medium text-stone-900 tabular-nums">
								{formatMeters(valueAt(hover.date, true))}
							</span>
						</p>
					{/if}
					<p class="text-stone-600">
						{adjusted ? t`Typical` : t`Expected`}
						<span class="font-medium text-stone-900 tabular-nums">
							{formatMeters(valueAt(hover.date, false))}
						</span>
					</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if adjusted && pace}
		{@const relative = percent(pace)}
		<p class="text-xs text-stone-500">
			{pace > 1
				? t`Growing faster than typical, at ${relative} of the usual pace. The forecast follows your measurements.`
				: t`Growing slower than typical, at ${relative} of the usual pace. The forecast follows your measurements.`}
		</p>
	{:else if measured.length <= 1}
		<p class="text-xs text-stone-500">
			{t`The curve starts at the first measurement. Log more over the years to compare with the forecast and adjust it to this tree.`}
		</p>
	{/if}
</div>
