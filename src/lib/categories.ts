// kept free of imports so drizzle-kit can load it through the schema
export const SPECIES_CATEGORIES = ['deciduous', 'conifer', 'fruit', 'shrub'] as const;
export type SpeciesCategory = (typeof SPECIES_CATEGORIES)[number];
