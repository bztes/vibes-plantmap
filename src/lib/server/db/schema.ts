import { randomBytes } from 'node:crypto';
import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull();

export const appSetting = sqliteTable('app_setting', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const BASEMAP_KINDS = ['style', 'raster'] as const;

/** Base maps users can pick from on the plan map, managed by admins. */
export const basemap = sqliteTable('basemap', {
	id: id(),
	name: text('name').notNull(),
	/** `style`: MapLibre style JSON URL, `raster`: XYZ tile URL template */
	kind: text('kind', { enum: BASEMAP_KINDS }).notNull(),
	url: text('url').notNull(),
	/** raster only, styles carry their own attribution */
	attribution: text('attribution'),
	tileSize: integer('tile_size').notNull().default(256),
	maxZoom: integer('max_zoom'),
	/** raster only: draw the labels of the first vector style on top */
	labels: integer('labels', { mode: 'boolean' }).notNull().default(false),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	position: integer('position').notNull().default(0),
	createdAt: createdAt()
});

export const SPECIES_CATEGORIES = ['deciduous', 'conifer', 'fruit', 'shrub'] as const;
export type SpeciesCategory = (typeof SPECIES_CATEGORIES)[number];

/** Tree species catalog. Rows without an owner are shared (created by an admin) and visible to everyone. */
export const species = sqliteTable(
	'species',
	{
		id: id(),
		ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
		/** base name, shown when there is no translation for the current locale */
		name: text('name').notNull(),
		/** locale → name, maintained by admins */
		nameTranslations: text('name_translations', { mode: 'json' })
			.$type<Record<string, string>>()
			.notNull()
			.default(sql`'{}'`),
		category: text('category', { enum: SPECIES_CATEGORIES }).notNull().default('deciduous'),
		/** mature height in meters */
		matureHeight: real('mature_height').notNull(),
		/** mature crown diameter in meters */
		matureSpread: real('mature_spread').notNull(),
		/** years until ~95% of mature size is reached */
		yearsToMaturity: integer('years_to_maturity').notNull(),
		color: text('color').notNull().default('#16a34a'),
		createdAt: createdAt()
	},
	(t) => [index('species_owner_idx').on(t.ownerId)]
);

/** A plan is one map area (garden, orchard, property) holding trees. */
export const plan = sqliteTable(
	'plan',
	{
		id: id(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		centerLng: real('center_lng').notNull(),
		centerLat: real('center_lat').notNull(),
		zoom: real('zoom').notNull().default(18),
		createdAt: createdAt()
	},
	(t) => [index('plan_owner_idx').on(t.ownerId)]
);

export const SHARE_ROLES = ['view', 'edit'] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

/** Share link of a plan: anyone with the token can view it, `edit` links also let signed in users change trees. */
export const planShare = sqliteTable(
	'plan_share',
	{
		token: text('token')
			.primaryKey()
			.$defaultFn(() => randomBytes(18).toString('base64url')),
		planId: text('plan_id')
			.notNull()
			.references(() => plan.id, { onDelete: 'cascade' }),
		role: text('role', { enum: SHARE_ROLES }).notNull(),
		createdAt: createdAt()
	},
	(t) => [index('plan_share_plan_idx').on(t.planId)]
);

export const tree = sqliteTable(
	'tree',
	{
		id: id(),
		planId: text('plan_id')
			.notNull()
			.references(() => plan.id, { onDelete: 'cascade' }),
		speciesId: text('species_id')
			.notNull()
			.references(() => species.id, { onDelete: 'restrict' }),
		label: text('label'),
		lng: real('lng').notNull(),
		lat: real('lat').notNull(),
		/** ISO date (YYYY-MM-DD), may be in the future for planned trees */
		plantedAt: text('planted_at').notNull(),
		/** height in meters when planted */
		heightAtPlanting: real('height_at_planting').notNull().default(1.5),
		/** crown diameter in meters when planted */
		spreadAtPlanting: real('spread_at_planting').notNull().default(0.5),
		/** optional per-tree overrides, e.g. for dwarf rootstock */
		matureHeightOverride: real('mature_height_override'),
		matureSpreadOverride: real('mature_spread_override'),
		notes: text('notes'),
		createdAt: createdAt()
	},
	(t) => [index('tree_plan_idx').on(t.planId)]
);

export const speciesRelations = relations(species, ({ many }) => ({ trees: many(tree) }));
export const planRelations = relations(plan, ({ many }) => ({
	trees: many(tree),
	shares: many(planShare)
}));
export const planShareRelations = relations(planShare, ({ one }) => ({
	plan: one(plan, { fields: [planShare.planId], references: [plan.id] })
}));
export const treeRelations = relations(tree, ({ one }) => ({
	plan: one(plan, { fields: [tree.planId], references: [plan.id] }),
	species: one(species, { fields: [tree.speciesId], references: [species.id] })
}));

export * from './auth.schema';
