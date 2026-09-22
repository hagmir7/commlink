import { useCallback } from 'react'

export default function ColumnResizeHandle({ onResize }) {
  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX

      const handleMouseMove = (moveEvent) => {
        onResize(moveEvent.clientX - startX)
      }
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [onResize]
  )

  return (
    <span
      onMouseDown={handleMouseDown}
      className="absolute top-0 z-10 h-full w-2 cursor-col-resize select-none hover:bg-blue-300/60"
      style={{ touchAction: 'none', right: -12 }}
    />
  )
}
