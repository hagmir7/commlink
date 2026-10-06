import React, { useEffect, useState, useCallback, memo } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'

const DRAG_STYLE = { WebkitAppRegion: 'drag' }
const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' }

const TitleBar = ({ title = 'Intercocina' }) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const hasElectron = typeof window !== 'undefined' && !!window.api

  useEffect(() => {
    if (!hasElectron) return

    window.api.isWindowMaximized?.().then((v) => {
      if (typeof v === 'boolean') setIsMaximized(v)
    })

    const unsubscribe = window.api.onWindowMaximized?.(setIsMaximized)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
      else window.api.removeWindowMaximizedListener?.(setIsMaximized)
    }
  }, [hasElectron])

  const handleMinimize = useCallback(() => window.api.minimizeWindow(), [])
  const handleMaximize = useCallback(() => window.api.maximizeWindow(), [])
  const handleClose = useCallback(() => window.api.closeWindow(), [])

  if (!hasElectron) return null

  return (
    <div
      className="shrink-0 h-8 flex items-center justify-between bg-gradient-to-b from-white to-gray-100 border-b border-gray-300 select-none"
      style={DRAG_STYLE}
      onDoubleClick={handleMaximize}
    >
      <div className="flex items-center gap-2 px-2 min-w-0">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold shrink-0">
          I
        </span>

        <span className="text-[13px] text-gray-800 font-semibold truncate" id="window-title">
          {title}
        </span>
      </div>

      <div className="flex items-center h-full shrink-0" style={NO_DRAG_STYLE}>
        <button
          type="button"
          onClick={handleMinimize}
          aria-label="Minimize window"
          title="Minimize"
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          <Minus size={11} />
        </button>

        <button
          type="button"
          onClick={handleMaximize}
          aria-label="Maximize window"
          title="Maximize"
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          {isMaximized ? <Copy size={10} /> : <Square size={10} />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close window"
          title="Close"
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}

export default memo(TitleBar)
