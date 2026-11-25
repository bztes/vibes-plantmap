import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value && value.trim() ? value.trim() : undefined);

export const variables = defineEnvVars({
	DATA_DIR: {
		description: 'Directory where plantmap stores its sqlite database (local.db).',
		schema: (value) => optional(value) ?? './data'
	}
});
