// YouTube の埋め込みプレイヤー（IFrame API）を React で使う部品。画面は持たない（枠・ボタンは使う側）。

export { PLAYER_STATE } from './types'
export type { YouTubeNamespace, YouTubePlayerLike, YouTubePlayerOptions } from './types'

export { YOUTUBE_IFRAME_API_URL, getYouTubeApi, loadYouTubeApi } from './loader'

export { createYouTubePlayer, isPlayerReady, togglePlayback } from './player'

export { useYouTubePlayer } from './useYouTubePlayer'
export type { UseYouTubePlayerOptions, YouTubePlayerControls, YouTubeTick } from './useYouTubePlayer'
