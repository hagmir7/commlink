import { useEffect, useState } from 'react'
import { Alert, Button, Progress, Spin } from 'antd'

const megabytes = (value) => `${((Number(value) || 0) / 1024 / 1024).toFixed(1)} Mo`

export default function UpdateProgress() {
  const [state, setState] = useState({ status: 'idle', revision: -1 })
  const [dismissed, setDismissed] = useState(null)

  useEffect(() => {
    if (!window.api?.onUpdateState) return
    let active = true
    const receive = (next) => {
      if (active) setState((previous) => (next.revision >= previous.revision ? next : previous))
    }
    const unsubscribe = window.api.onUpdateState(receive)
    window.api
      .getUpdateState()
      .then(receive)
      .catch(() => {})
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const identity = `${state.status}:${state.version || ''}:${state.message || ''}`
  if (state.status === 'idle' || dismissed === identity) return null
  const downloading = state.status === 'downloading'
  const downloaded = state.status === 'downloaded'
  const checking = state.status === 'checking'

  return (
    <aside
      className="fixed bottom-3 right-3 z-[10000] w-[340px] max-w-[calc(100vw-24px)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      aria-label="Mise à jour de Comlink"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Mise à jour de Comlink</span>
        {!downloading && !checking && (
          <Button
            size="small"
            type="text"
            onClick={() => setDismissed(identity)}
            aria-label="Masquer la notification"
          >
            ×
          </Button>
        )}
      </div>
      {checking ? (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Spin size="small" />
          Recherche de mises à jour…
        </div>
      ) : downloading ? (
        <>
          <div className="text-xs text-gray-600">Téléchargement de la version {state.version}</div>
          <Progress percent={Math.round(state.percent || 0)} size="small" />
          <div className="text-xs text-gray-500">
            {megabytes(state.transferred)} / {megabytes(state.total)} ·{' '}
            {megabytes(state.bytesPerSecond)}/s
          </div>
        </>
      ) : (
        <Alert
          type={downloaded ? 'success' : 'error'}
          showIcon
          title={downloaded ? `Version ${state.version} prête` : 'Mise à jour impossible'}
          description={
            downloaded
              ? 'Elle sera installée lorsque vous quitterez Comlink depuis le menu ou la zone de notification.'
              : state.message
          }
        />
      )}
    </aside>
  )
}
