# Auto Thumbnail

One thumbnail design for every post that has no image. You set the design in the admin under **Thumbnail**: a background color or image, the text color, and whether to show the site name and a logo. A client draws each post's title and date on it and uploads the result as the post's featured image.

The plugin draws nothing itself. Rendering an image takes 30–150 ms of CPU, more than a Workers free plan allows per request, so the drawing happens in the client. [Post To EmDash](https://github.com/RieTamura/Post-To-EmDash) (Obsidian) does it when it sends a post with no `cover` and no image in the body.

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

## Capabilities

| Capability         | Why                                                   |
| ------------------ | ----------------------------------------------------- |
| `media:read`       | List images in the admin to choose the background and logo |
| `media:bytes:read` | Serve the chosen background and logo to the client    |

## Development

```bash
npm install
npm test        # validate the manifest, then run the tests in the sandbox
npm run build
```
