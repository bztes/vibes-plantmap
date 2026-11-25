import { createContext } from 'svelte';

export type Snap = 'peek' | 'half' | 'full';

export interface PanelContext {
	/** true when the panel is a side panel, false when it's a bottom sheet */
	readonly wide: boolean;
	/** true while the sheet only shows the peek part, the rest should be inert */
	readonly collapsed: boolean;
	/** marks the part of a view that stays visible when the sheet is collapsed */
	peek: (element: HTMLElement) => () => void;
	/** opens the sheet to at least `snap`, no-op on wide screens */
	expand: (snap: Snap) => void;
}

export const [getPanel, setPanel] = createContext<PanelContext>();
