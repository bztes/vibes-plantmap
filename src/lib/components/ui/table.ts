import { tv } from 'tailwind-variants';

export const table = tv({
	slots: {
		wrapper: 'overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm',
		root: 'w-full text-left text-sm',
		head: 'border-b border-stone-200 bg-stone-50 text-xs font-medium tracking-wide text-stone-500 uppercase',
		th: 'px-4 py-3 font-medium',
		row: 'border-b border-stone-100 last:border-0 hover:bg-stone-50/60',
		td: 'px-4 py-3 align-middle text-stone-700'
	}
});
