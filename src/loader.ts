import type { YouTubeNamespace } from './types'

/** YouTube の IFrame API を読み込む URL */
export const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api'

type YTWindow = Window & { YT?: Partial<YouTubeNamespace>; onYouTubeIframeAPIReady?: () => void }

/** 読み込み済みなら window.YT を返す（まだなら null） */
export function getYouTubeApi(): YouTubeNamespace | null {
  if (typeof window === 'undefined') return null
  const yt = (window as YTWindow).YT
  return yt && typeof yt.Player === 'function' ? (yt as YouTubeNamespace) : null
}

let loading: Promise<YouTubeNamespace> | null = null

/**
 * IFrame API を 1 回だけ読み込む（何度呼んでも、script は 1 つだけ）。
 * 読み込み済みなら、すぐに終わる。
 * ほかのコードが window.onYouTubeIframeAPIReady を使っていても、上書きせずに続けて呼ぶ
 */
export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  const ready = getYouTubeApi()
  if (ready) return Promise.resolve(ready)
  if (!loading) {
    loading = new Promise<YouTubeNamespace>((resolve) => {
      const w = window as YTWindow
      const prev = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => {
        prev?.()
        const yt = getYouTubeApi()
        if (yt) resolve(yt)
      }
      if (!document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`)) {
        const tag = document.createElement('script')
        tag.src = YOUTUBE_IFRAME_API_URL
        tag.async = true
        document.head.appendChild(tag)
      }
    })
    // 失敗はしない（読めないときは待ち続ける）。テストで読み込み直せるように、終わったら忘れる
    void loading.then(() => {
      loading = null
    })
  }
  return loading
}
