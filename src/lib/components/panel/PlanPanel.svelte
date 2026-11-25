<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { t } from '@bztes/vibes-t0n';
	import { setPanel, type Snap } from './panel.ts';

	interface Props {
		/** how far the sheet is open on small screens */
		snap: Snap;
		/** pixels of the map the sheet covers, 0 on wide screens */
		inset: number;
		/** keeps the sheet collapsed, e.g. while a tree is placed on the map */
		locked?: boolean;
		children: Snippet;
	}

	// eslint-disable-next-line no-useless-assignment -- bindable, written by the effect below
	let { snap = $bindable(), inset = $bindable(), locked = false, children }: Props = $props();

	const ORDER: Snap[] = ['peek', 'half', 'full'];
	/** room left above a fully open sheet, so the map stays reachable */
	const FULL_GAP = 56;
	/** a sheet covering more than this share of the map doesn't move the map center further */
	const MAX_INSET = 0.6;

	const wideQuery = new MediaQuery('min-width: 768px');
	const wide = $derived(wideQuery.current);

	let element = $state<HTMLElement>();
	/** height of the area the sheet moves in */
	let space = $state(0);
	/** bottom edge of the view's always-visible part */
	let peekHeight = $state(120);
	/** height while the handle is dragged */
	let dragHeight = $state<number | null>(null);

	const shown = $derived(locked ? 'peek' : snap);
	const heights = $derived({
		peek: Math.min(peekHeight, space),
		half: Math.max(peekHeight, Math.round(space * 0.5)),
		full: Math.max(peekHeight, space - FULL_GAP)
	});
	const height = $derived(dragHeight ?? heights[shown]);

	$effect(() => {
		inset = wide ? 0 : Math.round(Math.min(heights[shown], space * MAX_INSET));
	});

	$effect(() => {
		const parent = element?.parentElement;
		if (!parent) return;
		const observer = new ResizeObserver(() => (space = parent.clientHeight));
		observer.observe(parent);
		return () => observer.disconnect();
	});

	setPanel({
		get wide() {
			return wide;
		},
		get collapsed() {
			return !wide && shown === 'peek';
		},
		peek(header) {
			// dragging the header moves the sheet, horizontal scrolling (e.g. of chips) still works
			header.dataset.peek = '';
			header.style.touchAction = 'pan-x';
			const measure = () => {
				if (!element) return;
				// both move together while the height animates, so the distance stays right
				peekHeight = Math.ceil(
					header.getBoundingClientRect().bottom - element.getBoundingClientRect().top
				);
			};
			const observer = new ResizeObserver(measure);
			observer.observe(header);
			return () => observer.disconnect();
		},
		expand(to) {
			if (ORDER.indexOf(to) > ORDER.indexOf(snap)) snap = to;
		}
	});

	let drag: { y: number; height: number; moved: boolean; handle: boolean } | null = null;

	function ondown(e: PointerEvent) {
		if (wide || locked || e.button !== 0) return;
		const target = e.target as Element;
		const handle = target.closest('[data-handle]');
		if (!handle && !target.closest('[data-peek]')) return;
		// controls in the header keep working, the rest of it drags the sheet
		if (!handle && target.closest('button, a, input, select, textarea, label')) return;
		drag = { y: e.clientY, height, moved: false, handle: !!handle };
		// the handle is at the top edge, dragging up leaves it right away
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onmove(e: PointerEvent) {
		if (!drag) return;
		const delta = drag.y - e.clientY;
		if (!drag.moved && Math.abs(delta) < 6) return;
		drag.moved = true;
		dragHeight = Math.max(heights.peek, Math.min(heights.full, drag.height + delta));
	}

	function onup() {
		if (!drag) return;
		const current = dragHeight;
		// the capture sends the click elsewhere, so a tap on the handle is handled here
		const tapped = drag.handle && !drag.moved;
		drag = null;
		dragHeight = null;
		if (tapped) return cycle();
		if (current === null) return;
		snap = ORDER.reduce((best, s) =>
			Math.abs(heights[s] - current) < Math.abs(heights[best] - current) ? s : best
		);
	}

	function cycle() {
		snap = snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek';
	}
</script>

<aside
	bind:this={element}
	class={[
		'z-10 flex flex-col overflow-hidden bg-white',
		wide
			? 'h-full w-96 shrink-0 border-r border-stone-200'
			: 'absolute inset-x-0 bottom-0 rounded-t-2xl shadow-[0_-4px_24px_rgb(28_25_23/0.14)]',
		!wide && dragHeight === null && 'transition-[height] duration-300 ease-out'
	]}
	style:height={wide ? undefined : `${height}px`}
	onpointerdown={ondown}
	onpointermove={onmove}
	onpointerup={onup}
	onpointercancel={onup}
>
	{#if !wide}
		<button
			type="button"
			data-handle
			class="flex h-5 w-full shrink-0 cursor-grab touch-none items-end justify-center"
			aria-label={shown === 'full' ? t`Collapse panel` : t`Expand panel`}
			aria-expanded={shown !== 'peek'}
			disabled={locked}
			onclick={(e) => {
				// pointer taps are handled on pointerup, this is for the keyboard
				if (e.detail === 0) cycle();
			}}
		>
			<span class="h-1.5 w-10 rounded-full bg-stone-300"></span>
		</button>
	{/if}
	<div class="flex min-h-0 flex-1 flex-col">{@render children()}</div>
</aside>
