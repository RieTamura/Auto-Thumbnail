# Auto Thumbnail

画像のない投稿に、決まったデザインのサムネイルを付けるための EmDash プラグインです。デザインは管理画面の「サムネイル」で決めます（背景の色か画像、文字の色、サイト名とロゴを入れるか）。そこにクライアントが記事のタイトルと日付を描き、アイキャッチとしてアップロードします。

このプラグインは画像を描きません。画像を1枚描くには CPU 時間が 30〜150 ミリ秒かかり、Workers の無料プランで1回に使える時間を超えるためです。描くのはクライアントの役目で、[Post To EmDash](https://github.com/RieTamura/Post-To-EmDash)（Obsidian）が、`cover` も本文の画像もない記事を送るときに描きます。

[English](README.md)

## 入れ方

入れ方は2つあります。

| 入れ元 | 動く場所 | Cloudflare のプラン | 入れ方・更新のしかた |
| --- | --- | --- | --- |
| EmDash のプラグインレジストリ | サンドボックスの中 | **Workers の有料プラン**（サンドボックスに必要） | 管理画面から |
| GitHub | サイト本体の中 | **無料プランで動く** | `npm install` のあと、**デプロイ** |

### レジストリから入れる

管理画面の「レジストリ」で **Auto Thumbnail** を探して入れます。Cloudflare では、レジストリのプラグインはサンドボックスの中で動くため、Workers の有料プランが必要です。

### GitHub から入れる

GitHub から入れて、`astro.config.mjs` で動かします。サンドボックスを使わないので、Workers の無料プランで動きます。入れるときに npm がビルドします。

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

そのあとサイトをデプロイします。あとで更新するときも、同じ `npm install` を実行してから**デプロイ**します（この入れ方では、管理画面から更新できません）。

## 使い方

1. プラグインを入れて、サイトをデプロイします。
2. 管理画面の「サムネイル」を開き、デザインを決めて保存します。背景の画像やロゴを使うときは、先に「メディア」でアップロードしておきます。
3. 「サムネイル」のページが思った言語で出ないときは、プラグインの設定「表示する言語」（自動・日本語・English）を選びます。自動は管理画面の言語に合わせます。
4. Post To EmDash の設定「自動サムネイル」をオンのままにします。`cover` も本文の画像もない記事を送ると、サムネイルが付きます。

## 仕組み

- `GET /_emdash/api/plugins/auto-thumbnail/design`（だれでも読める）：デザインを返します。`image` と `logo` はサイトからの相対 URL か `null`、`font` は Google Fonts のフォント名です。`overlay` は、写真の上でも読めるように文字の下に背景色の帯を敷くかどうかです。
- `GET /_emdash/api/plugins/auto-thumbnail/image?kind=background|logo`（だれでも読める）：選んだ背景とロゴだけを返します（PNG・JPEG・WebP・GIF）。
- 管理画面では、メディアの画像から背景とロゴを選べます。色は `#RRGGBB` の形かを確かめてから保存します。

サムネイルは、記事を送ったときに一度だけ作られます。あとでデザインを変えても、作ったサムネイルは変わりません。記事を送り直すと、新しいデザインで作り直します。

## 使う権限

| 権限               | 理由                                         |
| ------------------ | -------------------------------------------- |
| `media:read`       | 管理画面で、背景とロゴに使う画像を一覧にする |
| `media:bytes:read` | 選んだ背景とロゴを、クライアントに渡す       |

## 開発

```bash
npm install
npm test        # manifest を確かめ、サンドボックスでテストする
npm run build
```

## 問題の報告

[Issues](https://github.com/RieTamura/Auto-Thumbnail/issues) にお願いします。

## ライセンス

MIT
