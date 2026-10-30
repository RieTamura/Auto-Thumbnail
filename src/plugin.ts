import type { PluginContext, SandboxedPlugin } from "emdash/plugin";
import { pluginResponse } from "emdash/plugin";

/**
 * One thumbnail design for posts without an image. The admin page keeps the
 * design; the public `design` route hands it to the client that draws the
 * thumbnail (Post To EmDash in Obsidian), and the public `image` route hands
 * over the chosen background and logo. Nothing is drawn on the server: a
 * Workers free plan has too little CPU time to render an image per request.
 */

export interface Design {
	background: "color" | "image";
	backgroundColor: string;
	/** Media ID of the background image. */
	backgroundImage: string;
	/** Lay a band of the background color under the text, so it reads on a photo. */
	overlay: boolean;
	textColor: string;
	showSiteName: boolean;
	siteName: string;
	showLogo: boolean;
	/** Media ID of the logo. */
	logo: string;
	/** A Google Fonts family name. */
	font: string;
}

export const DEFAULT_DESIGN: Design = {
	background: "color",
	backgroundColor: "#F5E6D3",
	backgroundImage: "",
	overlay: true,
	textColor: "#3A2E25",
	showSiteName: true,
	siteName: "",
	showLogo: false,
	logo: "",
	font: "Zen Maru Gothic",
};

const SETTINGS_KEY = "design";
const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const FONT_PATTERN = /^[A-Za-z0-9 ]{1,60}$/;
const MEDIA_ID_PATTERN = /^[A-Za-z0-9_-]{0,64}$/;
/** Images the client can draw. SVG is left out: raw routes can't serve it. */
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** How many images the admin offers as background or logo. */
const MEDIA_LIMIT = 100;
const ROUTE_BASE = "/_emdash/api/plugins/auto-thumbnail";

async function readDesign(ctx: PluginContext): Promise<Design> {
	const saved = await ctx.settings.get<Partial<Design>>(SETTINGS_KEY);
	return { ...DEFAULT_DESIGN, ...saved };
}

/** Checks a submitted form. Returns the design, or the keys of the fields that were wrong. */
export function parseDesign(values: unknown): { design: Design } | { invalid: string[] } {
	const v = (typeof values === "object" && values !== null ? values : {}) as Record<string, unknown>;
	const text = (key: string) => (typeof v[key] === "string" ? (v[key] as string).trim() : "");
	const invalid: string[] = [];

	const color = (key: "backgroundColor" | "textColor") => {
		const value = text(key) || DEFAULT_DESIGN[key];
		if (!COLOR_PATTERN.test(value)) invalid.push(key);
		return value;
	};
	const mediaId = (key: "backgroundImage" | "logo") => {
		const value = text(key);
		if (!MEDIA_ID_PATTERN.test(value)) invalid.push(key);
		return value;
	};
	const font = text("font") || DEFAULT_DESIGN.font;
	if (!FONT_PATTERN.test(font)) invalid.push("font");

	const design: Design = {
		background: text("background") === "image" ? "image" : "color",
		backgroundColor: color("backgroundColor"),
		backgroundImage: mediaId("backgroundImage"),
		overlay: v.overlay === true,
		textColor: color("textColor"),
		showSiteName: v.showSiteName === true,
		siteName: text("siteName").slice(0, 80),
		showLogo: v.showLogo === true,
		logo: mediaId("logo"),
		font,
	};
	if (design.background === "image" && !design.backgroundImage) invalid.push("backgroundImage");
	if (design.showLogo && !design.logo) invalid.push("logo");
	return invalid.length ? { invalid } : { design };
}

/**
 * What the client draws from. Image URLs are relative to the site; a missing
 * image falls back to the background color or no logo.
 */
export function publicDesign(design: Design) {
	const useImage = design.background === "image" && !!design.backgroundImage;
	return {
		version: 1,
		width: 1200,
		height: 630,
		background: {
			color: design.backgroundColor,
			image: useImage ? `${ROUTE_BASE}/image?kind=background&v=${encodeURIComponent(design.backgroundImage)}` : null,
			overlay: useImage && design.overlay,
		},
		textColor: design.textColor,
		font: design.font,
		siteName: design.showSiteName && design.siteName ? design.siteName : null,
		logo: design.showLogo && design.logo ? `${ROUTE_BASE}/image?kind=logo&v=${encodeURIComponent(design.logo)}` : null,
	};
}

async function imageResponse(ctx: PluginContext, input: unknown) {
	const kind = (input as Record<string, unknown> | null)?.kind;
	const notFound = () => pluginResponse({ status: 404, headers: { "Content-Type": "text/plain" }, body: { kind: "text", value: "Not found" } });
	if (kind !== "background" && kind !== "logo") return notFound();

	const design = await readDesign(ctx);
	const id = kind === "background" ? design.backgroundImage : design.logo;
	if (!id || !ctx.media?.readBytes) return notFound();
	try {
		const file = await ctx.media.readBytes(id, { maxBytes: MAX_IMAGE_BYTES });
		if (!IMAGE_TYPES.includes(file.mimeType)) return notFound();
		return pluginResponse({ headers: { "Content-Type": file.mimeType }, body: { kind: "bytes", value: file.bytes } });
	} catch {
		return notFound();
	}
}

/** Admin page text. The admin tells the route its language; anything not Japanese gets English. */
const ADMIN_TEXT = {
	en: {
		title: "Thumbnail",
		note: "Posts without an image get this design, with their title and date drawn on it. Post To EmDash (Obsidian) draws it when it sends a post with no cover and no image in the body.",
		background: "Background",
		backgroundColor: "Color",
		backgroundImageOption: "Image",
		color: "Background color (#RRGGBB)",
		image: "Background image",
		overlay: "Put a band of the background color under the text",
		textColor: "Text color (#RRGGBB)",
		showSiteName: "Show the site name",
		siteName: "Site name",
		showLogo: "Show a logo",
		logo: "Logo",
		font: "Font (a Google Fonts name)",
		none: "(none)",
		save: "Save",
		saved: "Saved.",
		invalid: "Some fields are wrong. Colors look like #F5E6D3, and an image must be chosen when it is used.",
		noImages: "Upload images in Media first; they will appear in these lists.",
		currentBackground: "Background image",
		currentLogo: "Logo",
	},
	ja: {
		title: "サムネイル",
		note: "画像のない投稿は、このデザインにタイトルと日付を載せたサムネイルになります。Post To EmDash（Obsidian）で、cover も本文の画像もない記事を送ったときに作られます。",
		background: "背景",
		backgroundColor: "色",
		backgroundImageOption: "画像",
		color: "背景色（#RRGGBB）",
		image: "背景の画像",
		overlay: "文字の下に背景色の帯を敷く",
		textColor: "文字の色（#RRGGBB）",
		showSiteName: "サイト名を入れる",
		siteName: "サイト名",
		showLogo: "ロゴを入れる",
		logo: "ロゴ",
		font: "フォント（Google Fonts の名前）",
		none: "（なし）",
		save: "保存",
		saved: "保存しました。",
		invalid: "正しくない項目があります。色は #F5E6D3 のように書き、使う画像は選んでください。",
		noImages: "先に「メディア」で画像をアップロードしてください。ここの一覧に出てきます。",
		currentBackground: "背景の画像",
		currentLogo: "ロゴ",
	},
};

type AdminText = (typeof ADMIN_TEXT)["en"];

/**
 * The "language" setting wins; "auto" (the default) follows the admin. The live
 * admin has passed English even when it was in Japanese, as with site-likes.
 */
async function adminText(ctx: PluginContext, adminLocale: string | undefined): Promise<AdminText> {
	const setting = await ctx.settings.get<string>("language");
	const locale = setting === "ja" || setting === "en" ? setting : adminLocale;
	return locale?.toLowerCase().startsWith("ja") ? ADMIN_TEXT.ja : ADMIN_TEXT.en;
}

async function designPage(ctx: PluginContext, text: AdminText, design: Design) {
	const { items } = ctx.media ? await ctx.media.list({ mimeType: "image/", limit: MEDIA_LIMIT }) : { items: [] };
	const images = items.filter((item) => IMAGE_TYPES.includes(item.mimeType));
	const options = [{ label: text.none, value: "" }, ...images.map((item) => ({ label: item.filename, value: item.id }))];
	const urlOf = (id: string) => images.find((item) => item.id === id)?.url;

	const previews = [
		{ url: design.background === "image" ? urlOf(design.backgroundImage) : undefined, title: text.currentBackground },
		{ url: design.showLogo ? urlOf(design.logo) : undefined, title: text.currentLogo },
	].flatMap(({ url, title }) => (url ? [{ type: "image", url, alt: title, title }] : []));

	return {
		blocks: [
			{ type: "header", text: text.title },
			{ type: "context", text: text.note },
			...(images.length ? [] : [{ type: "banner", description: text.noImages }]),
			{
				type: "form",
				block_id: "design",
				fields: [
					{
						type: "select",
						action_id: "background",
						label: text.background,
						options: [
							{ label: text.backgroundColor, value: "color" },
							{ label: text.backgroundImageOption, value: "image" },
						],
						initial_value: design.background,
					},
					{ type: "text_input", action_id: "backgroundColor", label: text.color, initial_value: design.backgroundColor },
					{
						type: "select",
						action_id: "backgroundImage",
						label: text.image,
						options,
						initial_value: design.backgroundImage,
						condition: { field: "background", eq: "image" },
					},
					{
						type: "toggle",
						action_id: "overlay",
						label: text.overlay,
						initial_value: design.overlay,
						condition: { field: "background", eq: "image" },
					},
					{ type: "text_input", action_id: "textColor", label: text.textColor, initial_value: design.textColor },
					{ type: "toggle", action_id: "showSiteName", label: text.showSiteName, initial_value: design.showSiteName },
					{
						type: "text_input",
						action_id: "siteName",
						label: text.siteName,
						initial_value: design.siteName,
						condition: { field: "showSiteName", eq: true },
					},
					{ type: "toggle", action_id: "showLogo", label: text.showLogo, initial_value: design.showLogo },
					{
						type: "select",
						action_id: "logo",
						label: text.logo,
						options,
						initial_value: design.logo,
						condition: { field: "showLogo", eq: true },
					},
					{ type: "text_input", action_id: "font", label: text.font, initial_value: design.font },
				],
				submit: { label: text.save, action_id: "save" },
			},
			...previews,
		],
	};
}

async function adminRoute(ctx: PluginContext, input: unknown, adminLocale: string | undefined) {
	const interaction = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
	const text = await adminText(ctx, adminLocale);

	if (interaction.type === "form_submit" && interaction.action_id === "save") {
		const parsed = parseDesign(interaction.values);
		if ("invalid" in parsed) {
			return {
				...(await designPage(ctx, text, await readDesign(ctx))),
				toast: { type: "error", message: text.invalid },
			};
		}
		await ctx.settings.set(SETTINGS_KEY, parsed.design);
		return { ...(await designPage(ctx, text, parsed.design)), toast: { type: "success", message: text.saved } };
	}
	return designPage(ctx, text, await readDesign(ctx));
}

const plugin: SandboxedPlugin = {
	routes: {
		// Public: the client reads the design before it draws a thumbnail.
		design: {
			public: true,
			methods: ["GET"],
			handler: async (_routeCtx, ctx) => publicDesign(await readDesign(ctx)),
		},
		// Public: the chosen background or logo. Only these two images are served.
		image: {
			public: true,
			methods: ["GET"],
			response: "raw",
			cacheControl: "public, max-age=300",
			handler: async (routeCtx, ctx) => imageResponse(ctx, routeCtx.input),
		},
		// Admin page (default `plugins:manage` permission).
		admin: {
			handler: async (routeCtx, ctx) => adminRoute(ctx, routeCtx.input, routeCtx.ui?.locale),
		},
	},
};

export default plugin;
