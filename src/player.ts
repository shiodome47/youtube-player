import { PLAYER_STATE } from './types'
import type { YouTubeNamespace, YouTubePlayerLike, YouTubePlayerOptions } from './types'

/** 準備ができている（メソッドがそろっている）か */
export function isPlayerReady(player: YouTubePlayerLike | null | undefined): player is YouTubePlayerLike {
  return !!player && typeof player.getCurrentTime === 'function'
}

/** 再生中・読み込み中なら一時停止、止まっていれば再生 */
export function togglePlayback(player: YouTubePlayerLike): void {
  const st = player.getPlayerState?.()
  if (st === PLAYER_STATE.PLAYING || st === PLAYER_STATE.BUFFERING) player.pauseVideo?.()
  else player.playVideo?.()
}

/**
 * container の中に YT.Player を作る。
 * YT.Player は渡した要素を iframe に置き換えるので、container の中を空にして、新しい要素を作って渡す
 * （container そのものは置き換わらない。React が持っている要素を壊さない）
 */
export function createYouTubePlayer(yt: YouTubeNamespace, container: HTMLElement, options: YouTubePlayerOptions): YouTubePlayerLike {
  container.innerHTML = ''
  const placeholder = document.createElement('div')
  container.appendChild(placeholder)
  return new yt.Player(placeholder, options)
}
