import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { getYouTubeApi, loadYouTubeApi } from './loader'
import { createYouTubePlayer, isPlayerReady, togglePlayback } from './player'
import { PLAYER_STATE } from './types'
import type { YouTubePlayerLike } from './types'

/** 見張り（tickMs ごと）で知らせること */
export interface YouTubeTick {
  /** 今の位置（秒） */
  currentTime: number
  /** 動画の長さ（秒）。YouTube は再生するまで 0 のことがある */
  duration: number
  /** 状態（PLAYER_STATE）。分からなければ -1 */
  state: number
  /** 再生中か */
  playing: boolean
  player: YouTubePlayerLike
}

export interface UseYouTubePlayerOptions {
  /** 例: { rel: 0, playsinline: 1 }。最初に作るときだけ使う */
  playerVars?: Record<string, string | number>
  /** 準備ができたとき（ここから操作できる） */
  onReady?: (player: YouTubePlayerLike) => void
  /** 状態が変わったとき（state は PLAYER_STATE） */
  onStateChange?: (state: number, player: YouTubePlayerLike | null) => void
  /** 動画を再生できないとき（data は YouTube のエラーの番号） */
  onError?: (code: number) => void
  /** 準備ができているあいだ、tickMs ごとに呼ぶ（位置の見張り。A-B リピートなど） */
  onTick?: (tick: YouTubeTick) => void
  /** 見張りの間隔（ミリ秒。既定 100） */
  tickMs?: number
}

export interface YouTubePlayerControls {
  /** 準備ができたプレイヤー（まだなら null） */
  getPlayer: () => YouTubePlayerLike | null
  play: () => void
  pause: () => void
  /** 再生中なら一時停止、止まっていれば再生 */
  togglePlay: () => void
  seekTo: (seconds: number) => void
}

/**
 * containerRef の要素の中に、YouTube のプレイヤーを作る（IFrame API の読み込みも）。
 * videoId が変わったら作り直す。null なら作らない。
 * コールバックは毎回新しくてよい（いつも最新のものを呼ぶ）
 */
export function useYouTubePlayer(
  containerRef: RefObject<HTMLElement | null>,
  videoId: string | null,
  options: UseYouTubePlayerOptions = {},
): YouTubePlayerControls {
  const playerRef = useRef<YouTubePlayerLike | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const getPlayer = useCallback(() => {
    const p = playerRef.current
    return isPlayerReady(p) ? p : null
  }, [])

  useEffect(() => {
    if (!videoId) return
    let cancelled = false
    const create = () => {
      const container = containerRef.current
      const yt = getYouTubeApi()
      if (cancelled || !container || !yt) return
      playerRef.current?.destroy()
      playerRef.current = createYouTubePlayer(yt, container, {
        videoId,
        playerVars: optionsRef.current.playerVars,
        events: {
          onReady: () => {
            const p = getPlayer()
            if (p) optionsRef.current.onReady?.(p)
          },
          onStateChange: (e) => optionsRef.current.onStateChange?.(e.data, getPlayer()),
          onError: (e) => optionsRef.current.onError?.(e.data),
        },
      })
    }
    // 読み込み済みなら、すぐ作る（描いた直後から操作できるように）
    if (getYouTubeApi()) create()
    else void loadYouTubeApi().then(create)
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
    // containerRef は ref オブジェクトで変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, getPlayer])

  const tickMs = options.tickMs ?? 100
  useEffect(() => {
    const id = setInterval(() => {
      const onTick = optionsRef.current.onTick
      const player = getPlayer()
      if (!onTick || !player) return
      const state = player.getPlayerState?.() ?? -1
      onTick({ currentTime: player.getCurrentTime(), duration: player.getDuration(), state, playing: state === PLAYER_STATE.PLAYING, player })
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs, getPlayer])

  return {
    getPlayer,
    play: useCallback(() => getPlayer()?.playVideo?.(), [getPlayer]),
    pause: useCallback(() => getPlayer()?.pauseVideo?.(), [getPlayer]),
    togglePlay: useCallback(() => {
      const p = getPlayer()
      if (p) togglePlayback(p)
    }, [getPlayer]),
    seekTo: useCallback((seconds: number) => getPlayer()?.seekTo(seconds, true), [getPlayer]),
  }
}
