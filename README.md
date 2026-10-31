# Thumbnail Design for Post To EmDash

One thumbnail design for every post that has no image. You set the design in the admin under **Thumbnail**: a background color or image, the text color, and whether to show the site name and a logo. A client draws each post's title and date on it and uploads the result as the post's featured image.

> [!IMPORTANT]
> **This plugin does not work on its own.** It only keeps the design. The thumbnails are drawn by the Obsidian plugin [Post To EmDash](https://github.com/RieTamura/Post-To-EmDash) (0.2.0 or later), so you need both:
>
> - this plugin on your EmDash site, and
> - Post To EmDash in Obsidian, with **Automatic thumbnail** on (the default).
>
> Posts written in the EmDash admin or sent from anywhere else get no thumbnail.

The plugin draws nothing itself. Rendering an image takes 30–150 ms of CPU, more than a Workers free plan allows per request, so the drawing happens in the client. Post To EmDash does it when it sends a post with no `cover` and no image in the body.

Formerly named Auto Thumbnail. The slug, the package name and the API paths are still `auto-thumbnail`.

[日本語の説明はこちら](README_JA.md)

## Install

There are two ways to install it.

| From | Runs | Cloudflare plan | Install and update |
| --- | --- | --- | --- |
| The EmDash plugin registry | In the plugin sandbox | **Workers Paid** (the sandbox needs it) | From the admin |
| GitHub | In-process, with your site | **Workers Free is fine** | `npm install`, then **deploy** |

### From the registry

In the admin, open **Registry**, search for **Thumbnail Design for Post To EmDash** and install it. On Cloudflare, registry plugins run in the plugin sandbox, which needs the Workers Paid plan.

### From GitHub

Install it from GitHub and run it in-process from `astro.config.mjs`. It needs no sandbox, so it works on the Workers Free plan. npm builds it on install:

```sh
npm install github:RieTamura/Auto-Thumbnail
```

```js
import autoThumbnail from "auto-thumbnail";

emdash({
	// ...
	plugins: [autoThumbnail],
});
```

Then deploy the site. To update the plugin later, run the same `npm install` again and **deploy**; the admin cannot update a plugin installed this way.

## Setup

1. Install the plugin and deploy the site.
2. In the admin, open **Thumbnail** and choose the design, then save. To show a background image or a logo, upload it in **Media** first.
3. If the Thumbnail page shows in the wrong language, set the plugin's **Language** setting (Auto, 日本語, English). Auto follows the admin.
4. In Post To EmDash, leave **Automatic thumbnail** on. A post with no `cover` and no image in the body now gets a thumbnail when you send it.

## How it works

- `GET /_emdash/api/plugins/auto-thumbnail/design` (public) returns the design:

  ```json
  {
  	"version": 1,
  	"width": 1200,
  	"height": 630,
  	"background": { "color": "#F5E6D3", "image": "/_emdash/api/plugins/auto-thumbnail/image?kind=background&v=…", "overlay": true },
  	"textColor": "#3A2E25",
  	"font": "Zen Maru Gothic",
  	"siteName": "My Blog",
  	"logo": null
  }
  ```

  `image` and `logo` are relative to the site, or `null`. `font` is a Google Fonts family name. `overlay` asks for a band of the background color under the text, so it reads on a photo.

- `GET /_emdash/api/plugins/auto-thumbnail/image?kind=background|logo` (public) returns the chosen image. Only those two images are served; PNG, JPEG, WebP and GIF.
- The admin page lists the images in Media for the background and logo, and checks colors (`#RRGGBB`) before saving.

A thumbnail is made once, when the post is sent. Changing the design later does not change thumbnails already made; send the post again to redraw it.

## Capabilities

| Capability         | Why                                                        |
| ------------------ | ---------------------------------------------------------- |
| `media:read`       | List images in the admin to choose the background and logo |
| `media:bytes:read` | Serve the chosen background and logo to the client         |

## Development

```bash
npm install
npm test        # validate the manifest, then run the tests in the sandbox
npm run build
```

## Security

Report problems in [Issues](https://github.com/RieTamura/Auto-Thumbnail/issues).

## License

MIT
