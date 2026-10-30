import { afterEach, describe, expect, it } from "vitest";

import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from "@emdash-cms/plugin-test";

import { DEFAULT_DESIGN, parseDesign, publicDesign } from "../src/plugin";

let host: PluginRuntimeTestHost | undefined;

afterEach(async () => {
	await host?.dispose();
	host = undefined;
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function setup() {
	host = await createPluginRuntimeTestHost();
	const photo = await host.fixtures.media({ filename: "photo.png", mimeType: "image/png", bytes: PNG, width: 1200, height: 630 });
	const logo = await host.fixtures.media({ filename: "logo.png", mimeType: "image/png", bytes: PNG, width: 64, height: 64 });
	return { h: host, photo, logo };
}

const FORM = {
	background: "color",
	backgroundColor: "#F5E6D3",
	backgroundImage: "",
	overlay: true,
	textColor: "#3A2E25",
	showSiteName: true,
	siteName: "りえたむら",
	showLogo: false,
	logo: "",
	font: "Zen Maru Gothic",
};

/** Reads the design the way Obsidian does: a public GET, no login. */
async function getDesign(h: PluginRuntimeTestHost) {
	const response = await h.actions.routes.request("design", { method: "GET" });
	return { status: response.status, data: ((await response.json()) as { data: ReturnType<typeof publicDesign> }).data };
}

describe("parseDesign", () => {
	it("accepts a full form", () => {
		expect(parseDesign(FORM)).toEqual({ design: { ...FORM } });
	});

	it("rejects bad colors, fonts and missing images", () => {
		const result = parseDesign({ ...FORM, textColor: "red", font: "a;b", background: "image", showLogo: true });
		expect(result).toEqual({ invalid: expect.arrayContaining(["textColor", "font", "backgroundImage", "logo"]) });
	});

	it("fills empty colors and font with the defaults", () => {
		const result = parseDesign({ ...FORM, backgroundColor: "", textColor: " ", font: "" });
		expect(result).toMatchObject({
			design: { backgroundColor: DEFAULT_DESIGN.backgroundColor, textColor: DEFAULT_DESIGN.textColor, font: DEFAULT_DESIGN.font },
		});
	});
});

describe("design route", () => {
	it("serves the default design before anything is saved", async () => {
		const { h } = await setup();
		const { status, data } = await getDesign(h);
		expect(status).toBe(200);
		expect(data).toEqual(publicDesign(DEFAULT_DESIGN));
		expect(data.background.image).toBeNull();
	});

	it("serves what the admin saved, with image URLs", async () => {
		const { h, photo, logo } = await setup();
		await h.admin.submit("/design", "save", {
			...FORM,
			background: "image",
			backgroundImage: photo.id,
			showLogo: true,
			logo: logo.id,
		});
		const { data } = await getDesign(h);
		expect(data).toMatchObject({
			background: { color: "#F5E6D3", overlay: true },
			siteName: "りえたむら",
			font: "Zen Maru Gothic",
		});
		expect(data.background.image).toContain("/_emdash/api/plugins/auto-thumbnail/image?kind=background");
		expect(data.logo).toContain("kind=logo");
	});
});

describe("image route", () => {
	it("serves the chosen background and nothing else", async () => {
		const { h, photo } = await setup();
		await h.admin.submit("/design", "save", { ...FORM, background: "image", backgroundImage: photo.id });

		const background = await h.actions.routes.request("image", { method: "GET", url: "https://example.com/?kind=background" });
		expect(background.status).toBe(200);
		expect(background.headers.get("content-type")).toBe("image/png");
		expect(new Uint8Array(await background.arrayBuffer())).toEqual(PNG);

		const logo = await h.actions.routes.request("image", { method: "GET", url: "https://example.com/?kind=logo" });
		expect(logo.status).toBe(404);
		const other = await h.actions.routes.request("image", { method: "GET", url: "https://example.com/?kind=secret" });
		expect(other.status).toBe(404);
	});
});

describe("admin page", () => {
	it("offers the media images and keeps a bad form from being saved", async () => {
		const { h } = await setup();
		const page = await h.admin.loadPage("/design", { locale: "ja" });
		const form = page.blocks.find((block) => block.type === "form") as unknown as {
			fields: Array<{ action_id: string; options?: Array<{ label: string }> }>;
		};
		const select = form.fields.find((field) => field.action_id === "backgroundImage");
		expect(select?.options?.map((option) => option.label)).toEqual(expect.arrayContaining(["（なし）", "photo.png", "logo.png"]));

		const rejected = await h.admin.submit("/design", "save", { ...FORM, textColor: "red" }, { locale: "ja" });
		expect(rejected.toast?.type).toBe("error");
		expect((await getDesign(h)).data.textColor).toBe(DEFAULT_DESIGN.textColor);
	});
});
