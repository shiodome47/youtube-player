# @shiodome47/youtube-player

YouTube の埋め込みプレイヤー（IFrame API）を、React で使う部品です。**画面は持ちません**（枠・ボタンは使う側）。

- 見本: （公開したら、ここに Vercel の URL を書く）
- English: [see below](#english)

## できること

- **IFrame API の読み込み**（`loadYouTubeApi`）: 何度呼んでも script は 1 つだけ。読み込み済みならすぐ終わる。
  ほかのコードが `window.onYouTubeIframeAPIReady` を使っていても、上書きせずに続けて呼ぶ
- **プレイヤーを作る**（`useYouTubePlayer`）: 箱（`containerRef`）の中に作る。動画（`videoId`）が変わったら作り直し、消えたら片づける。
  YT.Player は渡した要素を iframe に置き換えるので、箱の中に新しい要素を作って渡す（React が持っている要素を壊さない）
- **準備ができたかの判定**: YouTube は準備ができるまで `getCurrentTime` などのメソッドが無い。`getPlayer()` は準備ができたものだけを返す
- **位置の見張り**（`onTick`）: YouTube は位置を知らせてくれないので、0.1 秒ごと（`tickMs`）に、位置・長さ・状態・再生中かを知らせる
  （A-B リピートは `@shiodome47/ab-repeat` の `createPolledABLoop` をここで呼ぶ）
- **操作**: `play`・`pause`・`togglePlay`（再生中・読み込み中なら一時停止、止まっていれば再生）・`seekTo`
- 状態の番号（`PLAYER_STATE.PLAYING` など）

アプリの事情（再生位置の保存・視聴時間・「この時刻から」・終わったら次の動画へ、など）は、`onReady`・`onStateChange`・`onTick` の中で使う側が行います。

## 入れ方

```bash
npm install @shiodome47/youtube-player
```

React 18 が必要です（`peerDependencies`。使う側のアプリに入っている React を使います）。ほかに入れるものはありません。

## 使い方

```tsx
import { useRef } from 'react'
import { useYouTubePlayer, PLAYER_STATE } from '@shiodome47/youtube-player'

export function YouTube({ videoId }: { videoId: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const yt = useYouTubePlayer(boxRef, videoId, {
    playerVars: { rel: 0, playsinline: 1 },
    onReady: (player) => player.seekTo(30, true),
    onStateChange: (state) => {
      if (state === PLAYER_STATE.ENDED) console.log('おわり')
    },
    onTick: ({ currentTime, playing }) => {
      // 0.1 秒ごと（準備ができているあいだ）
    },
  })
  return (
    <>
      <div ref={boxRef} style={{ aspectRatio: '16 / 9' }} />
      <button onClick={yt.togglePlay}>再生・一時停止</button>
    </>
  )
}
```

`useYouTubePlayer` のコールバックは毎回新しくてよい（いつも最新のものを呼ぶ）。`playerVars` は最初に作るときだけ使う。

## 返すもの・関数

| 名前 | 説明 |
|---|---|
| `useYouTubePlayer(containerRef, videoId, options)` | プレイヤーを作る。`{ getPlayer, play, pause, togglePlay, seekTo }` を返す |
| options: `playerVars`・`onReady(player)`・`onStateChange(state, player)`・`onError(code)`・`onTick(tick)`・`tickMs` | tick は `{ currentTime, duration, state, playing, player }` |
| `loadYouTubeApi()` | IFrame API を読み込む（Promise） |
| `getYouTubeApi()` | 読み込み済みなら `window.YT`（まだなら null） |
| `createYouTubePlayer(YT, container, options)` | React を使わずに作る |
| `isPlayerReady(player)`・`togglePlayback(player)` | 小さな道具 |
| `PLAYER_STATE` | `UNSTARTED`(-1)・`ENDED`(0)・`PLAYING`(1)・`PAUSED`(2)・`BUFFERING`(3)・`CUED`(5) |

`window` に型は足しません（使う側の型とぶつからないように）。テストで YouTube の代わりを置くときは `(window as unknown as { YT: YouTubeNamespace }).YT = …`。

## いっしょに使うと便利な部品

- `@shiodome47/video-zoom`: 動画（YouTube も）の 2 本指の拡大。YouTube の上の透明な面がタップを受けるので、`onTap` に `togglePlay` を渡す
- `@shiodome47/ab-repeat`: A-B リピート。`onTick` の中で `createPolledABLoop` の `check(currentTime, range)` を呼ぶ

## 使っているアプリ

- 手話学習アプリ（[shiodome47/shuwa-video-player](https://github.com/shiodome47/shuwa-video-player)）

## 開発

```bash
npm ci
npm test            # テスト
npm run typecheck   # 型の確かめ
npm run build       # dist/ を作る
npm run dev         # 見本のページ（http://localhost:5173）
```

npm への公開の手順は [`PUBLISHING.md`](PUBLISHING.md)。

---

## English

A React hook for the YouTube embedded player (IFrame API). It has no UI of its own — you bring the frame and the buttons.

```bash
npm install @shiodome47/youtube-player
```

```tsx
const boxRef = useRef<HTMLDivElement>(null)
const yt = useYouTubePlayer(boxRef, videoId, {
  playerVars: { rel: 0, playsinline: 1 },
  onReady: (player) => {},
  onStateChange: (state, player) => {},   // PLAYER_STATE.PLAYING etc.
  onTick: ({ currentTime, duration, state, playing }) => {}, // every 100 ms while ready
})
// yt.getPlayer() / yt.play() / yt.pause() / yt.togglePlay() / yt.seekTo(seconds)
return <div ref={boxRef} style={{ aspectRatio: '16 / 9' }} />
```

- Loads the IFrame API script once (`loadYouTubeApi`), without overwriting an existing `window.onYouTubeIframeAPIReady`.
- Creates the player inside your container (your element is not replaced), recreates it when `videoId` changes, destroys it on unmount.
- `getPlayer()` returns the player only once it is ready (YouTube's methods don't exist before `onReady`).
- YouTube doesn't push time updates, so `onTick` polls every `tickMs` (default 100 ms).
- Does not add types to `window`. Peer dependency: React 18. MIT licensed.
