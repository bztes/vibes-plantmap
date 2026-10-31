import { error } from '@sveltejs/kit';
import { command, form, query } from '$app/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import * as v from 'valibot';
import { db } from '#lib/server/db/index.ts';
import { SPECIES_CATEGORIES, species, tree } from '#lib/server/db/schema.ts';
import { getPlanAccess } from '#lib/server/access.ts';
import { requireAdmin, requireUser } from '#lib/server/guards.ts';
import { localizeSpecies } from '#lib/server/species.ts';
import { isLocale, t } from '#lib/i18n/index.ts';

const speciesSchema = v.object({
	/** set to update an existing species */
	id: v.optional(v.string()),
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, () => t`Name is required`),
		v.maxLength(80)
	),
	category: v.picklist(SPECIES_CATEGORIES),
	matureHeight: v.pipe(
		v.number(() => t`Required`),
		v.minValue(0.1),
		v.maxValue(150)
	),
	matureSpread: v.pipe(
		v.number(() => t`Required`),
		v.minValue(0.1),
		v.maxValue(100)
	),
	yearsToMaturity: v.pipe(
		v.number(() => t`Required`),
		v.integer(),
		v.minValue(1),
		v.maxValue(500)
	),
	color: v.pipe(v.string(), v.hexColor())
});

/** Shared species plus the user's own ones. */
export const getSpecies = query(async () => {
	const user = requireUser();
	const rows = await db
		.select()
		.from(species)
		.where(or(isNull(species.ownerId), eq(species.ownerId, user.id)));
	// only admins need every translation, see getSharedSpecies
	return localizeSpecies(rows).map(({ ownerId, nameTranslations, ...rest }) => {
		void nameTranslations;
		return { ...rest, shared: ownerId === null, editable: ownerId === user.id };
	});
});

/** Species that can be used in a plan: shared ones, the plan owner's and the user's own. */
export const getPlanSpecies = query(v.string(), async (planRef) => {
	const { plan, role } = await getPlanAccess(planRef);
	// viewers can't add or edit trees, so they only need what the plan uses
	if (role === 'view') return [];
	const user = requireUser();
	const rows = await db
		.select()
		.from(species)
		.where(
			or(isNull(species.ownerId), eq(species.ownerId, user.id), eq(species.ownerId, plan.ownerId))
		);
	return localizeSpecies(rows).map(({ ownerId, nameTranslations, ...rest }) => {
		void nameTranslations;
		return { ...rest, shared: ownerId === null, editable: ownerId === user.id };
	});
});

/** Species without an owner, managed by admins and visible to everyone. Includes all translations. */
export const getSharedSpecies = query(async () => {
	requireAdmin();
	const rows = await db.select().from(species).where(isNull(species.ownerId));
	return localizeSpecies(rows).map(({ ownerId, ...rest }) => ({
		...rest,
		shared: ownerId === null,
		editable: true
	}));
});

/** Creates a species owned by the user, or updates one of theirs. */
export const saveSpecies = form(speciesSchema, async ({ id, ...data }) => {
	const user = requireUser();
	if (id) {
		const updated = await db
			.update(species)
			.set(data)
			.where(and(eq(species.id, id), eq(species.ownerId, user.id)))
			.returning({ id: species.id });
		if (updated.length === 0) error(404, t`Species not found`);
	} else {
		await db.insert(species).values({ ...data, ownerId: user.id });
	}
	await getSpecies().refresh();
	return { saved: data.name };
});

/** Creates or updates a shared species. Admins only. */
export const saveSharedSpecies = form(speciesSchema, async ({ id, ...data }) => {
	requireAdmin();
	if (id) {
		const updated = await db
			.update(species)
			.set(data)
			.where(and(eq(species.id, id), isNull(species.ownerId)))
			.returning({ id: species.id });
		if (updated.length === 0) error(404, t`Species not found`);
	} else {
		await db.insert(species).values({ ...data, ownerId: null });
	}
	await Promise.all([getSharedSpecies().refresh(), getSpecies().refresh()]);
	return { saved: data.name };
});

/** Replaces the localized names of a species, empty names are dropped. Admins only. */
export const setSpeciesTranslations = command(
	v.object({
		id: v.string(),
		translations: v.record(
			v.pipe(
				v.string(),
				v.check(
					(locale: string) => isLocale(locale),
					() => t`Unknown language`
				)
			),
			v.pipe(v.string(), v.trim(), v.maxLength(80))
		)
	}),
	async ({ id, translations }) => {
		requireAdmin();
		const nameTranslations = Object.fromEntries(
			Object.entries(translations).filter(([, name]) => name)
		);
		const [row] = await db
			.update(species)
			.set({ nameTranslations })
			.where(eq(species.id, id))
			.returning({ ownerId: species.ownerId });
		if (!row) error(404, t`Species not found`);
		await Promise.all([
			getSpecies().refresh(),
			row.ownerId === null ? getSharedSpecies().refresh() : undefined
		]);
	}
);

export const deleteSpecies = command(v.string(), async (id) => {
	const user = requireUser();
	// admins may also delete shared species
	const owner =
		user.role === 'admin'
			? or(eq(species.ownerId, user.id), isNull(species.ownerId))
			: eq(species.ownerId, user.id);
	const deletable = and(eq(species.id, id), owner);
	const row = await db.query.species.findFirst({ where: deletable });
	if (!row) error(404, t`Species not found`);
	const used = await db.query.tree.findFirst({ where: eq(tree.speciesId, id) });
	if (used) error(409, t`This species is still used by trees in a plan`);
	await db.delete(species).where(deletable);
	await Promise.all([
		getSpecies().refresh(),
		row.ownerId === null ? getSharedSpecies().refresh() : undefined
	]);
});
