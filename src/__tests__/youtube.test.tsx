import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PLAYER_STATE,
  YOUTUBE_IFRAME_API_URL,
  createYouTubePlayer,
  getYouTubeApi,
  isPlayerReady,
  loadYouTubeApi,
  togglePlayback,
  useYouTubePlayer,
} from '../index'
import type { UseYouTubePlayerOptions, YouTubeNamespace, YouTubePlayerControls, YouTubePlayerOptions } from '../index'

type W = { YT?: YouTubeNamespace; onYouTubeIframeAPIReady?: () => void }
const w = window as unknown as W

/** YouTube の代わり。作ったプレイヤーを覚えておく */
function fakeYouTube() {
  const created: { el: HTMLElement; options: YouTubePlayerOptions; player: ReturnType<typeof makePlayer> }[] = []
  function makePlayer() {
    const p = {
      time: 0,
      state: PLAYER_STATE.UNSTARTED as number,
      ready: false,
      destroyed: false,
      seeks: [] as number[],
      calls: [] as string[],
    }
    const api = {
      getCurrentTime: () => p.time,
      getDuration: () => 300,
      seekTo: (s: number) => p.seeks.push(s),
      getPlayerState: () => p.state,
      playVideo: () => p.calls.push('play'),
      pauseVideo: () => p.calls.push('pause'),
      destroy: () => {
        p.destroyed = true
      },
    }
    return { p, api }
  }
  const YT = {
    Player: function (el: HTMLElement, options: YouTubePlayerOptions) {
      const player = makePlayer()
      created.push({ el, options, player })
      // 本物と同じく、準備ができるまではメソッドが無い
      return new Proxy(player.api, {
        get: (t, k) => (k === 'destroy' || player.p.ready ? t[k as keyof typeof t] : undefined),
      })
    },
  } as unknown as YouTubeNamespace
  const ready = (i = created.length - 1) => {
    created[i].player.p.ready = true
    act(() => created[i].options.events?.onReady?.())
  }
  return { YT, created, ready }
}

beforeEach(() => {
  delete w.YT
  delete w.onYouTubeIframeAPIReady
  document.querySelectorAll(`script[src="${YOUTUBE_IFRAME_API_URL}"]`).forEach((s) => s.remove())
})
afterEach(() => vi.useRealTimers())

describe('IFrame API の読み込み', () => {
  it('まだ無ければ null・script は 1 つだけ入れる・準備の合図で終わる（前の合図も呼ぶ）', async () => {
    expect(getYouTubeApi()).toBeNull()
    const prev = vi.fn()
    w.onYouTubeIframeAPIReady = prev
    const a = loadYouTubeApi()
    const b = loadYouTubeApi()
    expect(document.querySelectorAll(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)).toHaveLength(1)
    const yt = fakeYouTube()
    w.YT = yt.YT
    w.onYouTubeIframeAPIReady?.()
    expect(await a).toBe(yt.YT)
    expect(await b).toBe(yt.YT)
    expect(prev).toHaveBeenCalledTimes(1)
  })

  it('読み込み済みなら、script を入れずにすぐ終わる', async () => {
    const yt = fakeYouTube()
    w.YT = yt.YT
    expect(await loadYouTubeApi()).toBe(yt.YT)
    expect(document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)).toBeNull()
  })
})

describe('プレイヤーの小さな道具', () => {
  it('createYouTubePlayer: 箱の中に新しい要素を作って渡す（箱は置き換えない）', () => {
    const yt = fakeYouTube()
    const box = document.createElement('div')
    box.innerHTML = '<span>古い中身</span>'
    createYouTubePlayer(yt.YT, box, { videoId: 'abc' })
    expect(box.children).toHaveLength(1)
    expect(yt.created[0].el.parentElement).toBe(box)
    expect(yt.created[0].options.videoId).toBe('abc')
  })

  it('isPlayerReady・togglePlayback', () => {
    const yt = fakeYouTube()
    const player = createYouTubePlayer(yt.YT, document.createElement('div'), { videoId: 'abc' })
    expect(isPlayerReady(player)).toBe(false)
    yt.created[0].player.p.ready = true
    expect(isPlayerReady(player)).toBe(true)
    togglePlayback(player)
    yt.created[0].player.p.state = PLAYER_STATE.PLAYING
    togglePlayback(player)
    yt.created[0].player.p.state = PLAYER_STATE.BUFFERING
    togglePlayback(player)
    expect(yt.created[0].player.p.calls).toEqual(['play', 'pause', 'pause'])
  })
})

describe('useYouTubePlayer', () => {
  let controls: YouTubePlayerControls
  function Player({ videoId, ...options }: { videoId: string | null } & UseYouTubePlayerOptions) {
    const ref = useRef<HTMLDivElement>(null)
    controls = useYouTubePlayer(ref, videoId, options)
    return <div ref={ref} data-testid="box" />
  }

  it('読み込み済みなら描いてすぐ作る。準備ができたら onReady・操作できる', () => {
    const yt = fakeYouTube()
    w.YT = yt.YT
    const onReady = vi.fn()
    render(<Player videoId="abc" playerVars={{ rel: 0 }} onReady={onReady} />)
    expect(yt.created).toHaveLength(1)
    expect(yt.created[0].options).toMatchObject({ videoId: 'abc', playerVars: { rel: 0 } })
    // 準備ができるまでは null（メソッドが無い）
    expect(controls.getPlayer()).toBeNull()
    controls.play()
    yt.ready()
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(controls.getPlayer()).not.toBeNull()
    controls.play()
    controls.seekTo(42)
    controls.togglePlay()
    expect(yt.created[0].player.p.calls).toEqual(['play', 'play'])
    expect(yt.created[0].player.p.seeks).toEqual([42])
  })

  it('まだ読み込んでいなければ、読み込んでから作る', async () => {
    render(<Player videoId="abc" />)
    expect(document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)).not.toBeNull()
    const yt = fakeYouTube()
    w.YT = yt.YT
    await act(async () => {
      w.onYouTubeIframeAPIReady?.()
      await Promise.resolve()
    })
    expect(yt.created).toHaveLength(1)
  })

  it('onStateChange に状態とプレイヤーを渡す', () => {
    const yt = fakeYouTube()
    w.YT = yt.YT
    const onStateChange = vi.fn()
    render(<Player videoId="abc" onStateChange={onStateChange} />)
    yt.ready()
    act(() => yt.created[0].options.events?.onStateChange?.({ data: PLAYER_STATE.PAUSED }))
    expect(onStateChange).toHaveBeenCalledWith(PLAYER_STATE.PAUSED, expect.anything())
  })

  it('準備ができているあいだ、tickMs ごとに位置・長さ・再生中かを知らせる', () => {
    vi.useFakeTimers()
    const yt = fakeYouTube()
    w.YT = yt.YT
    const onTick = vi.fn()
    render(<Player videoId="abc" onTick={onTick} tickMs={100} />)
    act(() => vi.advanceTimersByTime(300))
    expect(onTick).not.toHaveBeenCalled() // まだ準備ができていない
    yt.ready()
    const p = yt.created[0].player.p
    p.time = 12.5
    p.state = PLAYER_STATE.PLAYING
    act(() => vi.advanceTimersByTime(100))
    expect(onTick).toHaveBeenLastCalledWith(expect.objectContaining({ currentTime: 12.5, duration: 300, state: 1, playing: true }))
    act(() => vi.advanceTimersByTime(250))
    expect(onTick).toHaveBeenCalledTimes(3)
  })

  it('動画が変わったら作り直す・消したら片づける・videoId が null なら作らない', () => {
    const yt = fakeYouTube()
    w.YT = yt.YT
    const { rerender, unmount } = render(<Player videoId="abc" />)
    rerender(<Player videoId="xyz" />)
    expect(yt.created).toHaveLength(2)
    expect(yt.created[0].player.p.destroyed).toBe(true)
    expect(yt.created[1].options.videoId).toBe('xyz')
    unmount()
    expect(yt.created[1].player.p.destroyed).toBe(true)
    render(<Player videoId={null} />)
    expect(yt.created).toHaveLength(2)
  })
})
