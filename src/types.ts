/**
 * YouTube の IFrame API（https://developers.google.com/youtube/iframe_api_reference）のうち、この部品で使うところ。
 * window に型を足さない（使う側の型とぶつからないように）。window.YT は getYouTubeApi() で読む。
 */

/** YT.Player の状態（getPlayerState() と onStateChange の data） */
export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

/**
 * YT.Player。準備ができる（onReady）までは、getCurrentTime などのメソッドが無いことがある。
 * 呼ぶ前に isPlayerReady() で確かめるか、useYouTubePlayer の getPlayer() を使う
 */
export interface YouTubePlayerLike {
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getPlayerState?(): number
  getPlaybackRate?(): number
  setPlaybackRate?(rate: number): void
  playVideo?(): void
  pauseVideo?(): void
  destroy(): void
}

/** new YT.Player(el, options) の options のうち、この部品で使うところ */
export interface YouTubePlayerOptions {
  videoId: string
  /** 例: { rel: 0, playsinline: 1 }（https://developers.google.com/youtube/player_parameters） */
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onStateChange?: (e: { data: number }) => void
    onError?: (e: { data: number }) => void
  }
}

/** window.YT */
export interface YouTubeNamespace {
  Player: new (el: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerLike
}
