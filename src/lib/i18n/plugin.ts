import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MagicString from 'magic-string';
import { parse as parseSvelte } from 'svelte/compiler';
import { parseSync, type Plugin } from 'vite';

/*
 * Finds every t`...` in src/, collects the texts into locales/<locale>.json, grouped by source
 * file and keyed by a short hash of the text, and rewrites each call into a lookup in that file's
 * translations:
 *
 *   t`Hello ${user.name}`  →  __t(__i18n, "<hash>", "Hello {user.name}", { "user.name": user.name })
 *
 * Placeholders are named after the expression when it is a plain variable or property access,
 * otherwise after their position ({0}, {1}, …). Untranslated texts are stored as "" and fall
 * back to the fallback locale, then to the text in the code.
 *
 * `__i18n` is a module per source file. On the server it holds the translations of every locale;
 * in the browser it loads only the current locale (one chunk per file and locale) with a top-level
 * await, so the file renders synchronously once imported. The fallback is applied at build time,
 * so each chunk is complete on its own, and texts equal to the code are left out, as the lookup
 * already contains them.
 *
 * The supported locales are the fallback locale plus every locales/<locale>.json, so adding a
 * language is creating an empty file for it. locales/_t0n.json is not a locale: it is generated
 * with every text as it is in the code, to look up which text a hash belongs to.
 */

const runtime = fileURLToPath(new URL('./index.ts', import.meta.url));
const sourceFile = /\.(svelte|[cm]?[jt]s)$/;

// The source path is hex encoded: SvelteKit treats every id containing ".remote." as remote module.
// virtual:i18n:<file> holds the translations of a file, virtual:i18n:<file>:<locale> those of one locale.
const virtualPrefix = 'virtual:i18n:';
const virtualId = (file: string, locale?: string) =>
	virtualPrefix + Buffer.from(file).toString('hex') + (locale ? `:${locale}` : '');
const configId = 'virtual:i18n-config';
/** Catalog of the texts in the code, written next to the locales but not one of them. */
const codeCatalog = '_t0n';

/** source file (relative to src/) → hash of the source text → translation */
type Catalog = Record<string, Record<string, string>>;

interface Node {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
}

interface TemplateLiteral extends Node {
	quasis: { value: { raw: string; cooked: string | null } }[];
	expressions: Node[];
}

interface TaggedTemplate extends Node {
	tag: Node & { name?: string };
	quasi: TemplateLiteral;
}

function isT(node: Node): node is TaggedTemplate {
	return (
		node.type === 'TaggedTemplateExpression' &&
		(node as TaggedTemplate).tag.type === 'Identifier' &&
		(node as TaggedTemplate).tag.name === 't'
	);
}

function collect(root: unknown): TaggedTemplate[] {
	const found: TaggedTemplate[] = [];
	const seen = new Set<unknown>();
	(function walk(value: unknown) {
		if (!value || typeof value !== 'object' || seen.has(value)) return;
		seen.add(value);
		if (Array.isArray(value)) return value.forEach(walk);
		const node = value as Node;
		if (node.type === 'StyleSheet') return;
		if (isT(node)) found.push(node);
		for (const key in node) if (key !== 'parent' && key !== 'metadata') walk(node[key]);
	})(root);
	return found.sort((a, b) => a.start - b.start);
}

interface Script {
	start: number;
	module: boolean;
}

function parse(code: string, id: string): { nodes: TaggedTemplate[]; scripts?: Script[] } {
	if (id.endsWith('.svelte')) {
		const ast = parseSvelte(code, { modern: true });
		const scripts = [ast.module, ast.instance]
			.filter((s) => s != null)
			.map((s) => ({
				start: (s.content as unknown as Node).start,
				module: s.context === 'module'
			}));
		return { nodes: collect(ast), scripts };
	}
	const result = parseSync(id, code, { lang: /\.[cm]?ts$/.test(id) ? 'ts' : 'js' });
	if (result.errors.length) throw new Error(result.errors[0].message);
	return { nodes: collect(result.program) };
}

const plainAccess = /^[A-Za-z_$][\w$]*(\??\.[A-Za-z_$][\w$]*)*$/;

function placeholder(code: string, expression: Node, index: number) {
	const source = code.slice(expression.start, expression.end).trim();
	return plainAccess.test(source) ? source.replaceAll('?.', '.') : String(index);
}

/** Key of a text in the catalogs, unique within its source file. */
function hash(message: string) {
	return createHash('sha256').update(message).digest('base64url').slice(0, 8);
}

function message(code: string, node: TaggedTemplate) {
	const { quasis, expressions } = node.quasi;
	return quasis
		.map((q, i) => {
			const text = q.value.cooked ?? q.value.raw;
			return i < expressions.length ? `${text}{${placeholder(code, expressions[i], i)}}` : text;
		})
		.join('');
}

/** Source of code[start, end) with every outermost t`` inside replaced by its lookup. */
function rewrite(code: string, nodes: TaggedTemplate[], start: number, end: number): string {
	let out = '';
	let pos = start;
	for (const node of nodes) {
		if (node.start < pos || node.end > end) continue;
		out += code.slice(pos, node.start) + lookup(code, nodes, node);
		pos = node.end;
	}
	return out + code.slice(pos, end);
}

function lookup(code: string, nodes: TaggedTemplate[], node: TaggedTemplate) {
	const values = node.quasi.expressions.map(
		(e, i) =>
			`${JSON.stringify(placeholder(code, e, i))}: (${rewrite(code, nodes, e.start, e.end)})`
	);
	const text = message(code, node);
	const args = [
		JSON.stringify(hash(text)),
		JSON.stringify(text),
		...(values.length ? [`{ ${values.join(', ')} }`] : [])
	];
	return `__t(__i18n, ${args.join(', ')})`;
}

export interface I18nOptions {
	/** Locale used for missing translations and when none of the user's languages is supported. Default: 'en'. */
	fallbackLocale?: string;
}

export function i18n({ fallbackLocale = 'en' }: I18nOptions = {}): Plugin {
	let srcDir: string;
	let localesDir: string;
	/** fallback locale first, then every locale with a file in locales/ */
	let locales: string[];
	let scanned = false;
	/** content of every loaded virtual module per environment, to only update what changed */
	const loaded = new Map<string, string>();

	const localeFile = (locale: string) => path.join(localesDir, `${locale}.json`);
	const group = (file: string) => path.relative(srcDir, file).split(path.sep).join('/');

	function readCatalog(locale: string): Catalog {
		const target = localeFile(locale);
		const text = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
		return text.trim() ? JSON.parse(text) : {};
	}

	function writeCatalog(locale: string, catalog: Catalog) {
		const target = localeFile(locale);
		const sorted = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => (a < b ? -1 : 1)));
		const text = JSON.stringify(sorted, null, '\t') + '\n';
		if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === text) return;
		fs.mkdirSync(localesDir, { recursive: true });
		fs.writeFileSync(target, text);
	}

	/** Makes the group of `file` in every catalog contain exactly `messages`, keeping translations. */
	function sync(file: string, messages: string[]) {
		const key = group(file);
		for (const locale of [...locales, codeCatalog]) {
			const catalog = readCatalog(locale);
			if (messages.length) {
				const existing = catalog[key] ?? {};
				const text = (m: string) => (locale === codeCatalog ? m : (existing[hash(m)] ?? ''));
				catalog[key] = Object.fromEntries(messages.map((m) => [hash(m), text(m)]));
			} else if (key in catalog) delete catalog[key];
			else continue;
			writeCatalog(locale, catalog);
		}
	}

	function extract(code: string, id: string) {
		const parsed = parse(code, id);
		const messages = [...new Set(parsed.nodes.map((n) => message(code, n)))];
		sync(id, messages);
		return { ...parsed, messages };
	}

	/** Extracts all files once, so the catalogs are complete and groups of deleted files removed. */
	function scan() {
		const sources = new Set<string>();
		for (const rel of fs.globSync('**/*.{svelte,js,ts,mjs,mts,cjs,cts}', { cwd: srcDir })) {
			const file = path.join(srcDir, rel);
			sources.add(group(file));
			const code = fs.readFileSync(file, 'utf8');
			if (!code.includes('t`')) {
				sync(file, []);
				continue;
			}
			try {
				extract(code, file);
			} catch {
				// Syntax errors get reported when the file is transformed.
			}
		}
		for (const locale of [...locales, codeCatalog]) {
			const catalog = readCatalog(locale);
			for (const key of Object.keys(catalog)) if (!sources.has(key)) delete catalog[key];
			writeCatalog(locale, catalog);
		}
	}

	/**
	 * Texts of `file` in `locale`, missing ones taken from the fallback locale. Texts equal to the
	 * code (the key is their hash) are left out.
	 */
	function translations(file: string, locale: string) {
		const own = readCatalog(locale)[group(file)] ?? {};
		const fallback = readCatalog(fallbackLocale)[group(file)] ?? {};
		const result: Record<string, string> = {};
		for (const key of Object.keys({ ...fallback, ...own })) {
			const text = own[key] || fallback[key];
			if (text && hash(text) !== key) result[key] = text;
		}
		return result;
	}

	/** Code of a virtual translation module, see the top of this file. */
	function moduleCode(id: string, environment: string) {
		const [hex, locale] = id.slice(virtualPrefix.length + 1).split(':');
		const file = Buffer.from(hex, 'hex').toString();
		if (locale) return `export default ${JSON.stringify(translations(file, locale))};`;
		if (environment !== 'client') {
			const messages = Object.fromEntries(locales.map((l) => [l, translations(file, l)]));
			return `export default { messages: ${JSON.stringify(messages)} };`;
		}
		const load = locales.map(
			(l) => `${JSON.stringify(l)}: () => import(${JSON.stringify(virtualId(file, l))})`
		);
		return (
			`import { __load } from ${JSON.stringify(runtime)};\n` +
			`export default await __load({ messages: {}, load: { ${load.join(', ')} } });`
		);
	}

	return {
		name: 'i18n',
		enforce: 'pre',
		configResolved(config) {
			srcDir = path.join(config.root, 'src');
			localesDir = path.join(config.root, 'locales');
			const found = fs.existsSync(localesDir)
				? fs.globSync('*.json', { cwd: localesDir }).map((f) => path.basename(f, '.json'))
				: [];
			const others = found.filter((l) => l !== fallbackLocale && l !== codeCatalog);
			locales = [fallbackLocale, ...others.sort()];
		},
		configureServer(server) {
			// Adding or removing a language changes the config and every translation module.
			const onChange = (file: string) => {
				if (path.dirname(file) !== localesDir || path.extname(file) !== '.json') return;
				if (path.basename(file, '.json') === codeCatalog) return;
				const exists = fs.existsSync(file);
				if (locales.includes(path.basename(file, '.json')) === exists) return;
				server.config.logger.info(`i18n: locales changed, restarting server`);
				void server.restart();
			};
			server.watcher.add(localesDir);
			server.watcher.on('add', onChange).on('unlink', onChange);
		},
		resolveId: {
			filter: { id: /^virtual:i18n[:-]/ },
			handler: (id) => '\0' + id
		},
		load: {
			filter: { id: /^\0virtual:i18n[:-]/ },
			handler(id) {
				if (id === '\0' + configId) {
					return `export const fallbackLocale = ${JSON.stringify(fallbackLocale)};\nexport const locales = ${JSON.stringify(locales)};`;
				}
				for (const locale of locales) this.addWatchFile(localeFile(locale));
				const code = moduleCode(id, this.environment.name);
				loaded.set(`${this.environment.name}:${id}`, code);
				return code;
			}
		},
		hotUpdate({ file }) {
			if (!locales.some((l) => file === localeFile(l))) return;
			const { moduleGraph, name } = this.environment;
			const changed = [];
			for (const [key, code] of loaded) {
				if (!key.startsWith(name + ':')) continue;
				const id = key.slice(name.length + 1);
				const mod = moduleGraph.getModuleById(id);
				if (!mod || moduleCode(id, name) === code) continue;
				moduleGraph.invalidateModule(mod);
				changed.push(mod);
			}
			return changed;
		},
		buildStart() {
			if (scanned) return;
			scanned = true;
			scan();
		},
		transform: {
			filter: { id: sourceFile, code: 't`' },
			handler(code, id) {
				if (!id.startsWith(srcDir + path.sep) || id === runtime) return;

				let parsed;
				try {
					parsed = extract(code, id);
				} catch {
					return; // let the regular compiler report the syntax error
				}
				if (!parsed.nodes.length) return;

				const s = new MagicString(code);
				let pos = 0;
				for (const node of parsed.nodes) {
					if (node.start < pos) continue; // nested, part of the outer lookup
					s.overwrite(node.start, node.end, lookup(code, parsed.nodes, node));
					pos = node.end;
				}

				const header =
					`import { __t } from ${JSON.stringify(runtime)}; ` +
					`import __i18n from ${JSON.stringify(virtualId(id))};`;

				if (!parsed.scripts) s.prepend(header + '\n');
				else if (parsed.scripts.length) {
					const script = parsed.scripts.find((s) => s.module) ?? parsed.scripts[0];
					s.appendLeft(script.start, '\n' + header);
				} else s.prepend(`<script>\n${header}\n</script>\n`);

				return { code: s.toString(), map: s.generateMap({ hires: 'boundary', source: id }) };
			}
		}
	};
}
