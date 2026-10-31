import type { SessionUser, Session } from '#lib/server/auth.ts';
import type { Locale } from '#lib/i18n/config.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: SessionUser;
			session?: Session;
			locale: Locale;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
