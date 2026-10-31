import { tv } from 'tailwind-variants';

/** Shared look of text-like form controls. */
export const control = tv({
	base: 'w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/30 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/30',
	variants: {
		size: { sm: 'h-8', md: 'h-10' },
		multiline: { true: 'h-auto py-2' }
	},
	defaultVariants: { size: 'md' }
});
