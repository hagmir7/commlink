import { useRef, useState } from 'react'
import { Modal } from 'antd'
import { MinusOutlined, ExpandOutlined, CloseOutlined, CompressOutlined } from '@ant-design/icons'
import Draggable from 'react-draggable'

/**
 * DesktopWindow — a draggable, chrome-styled window modal.
 *
 * Sage palette:
 *   50  #F4F6F1   surface / title bar
 *   100 #E7EBE0   hover surface
 *   200 #D2DAC4   borders / dividers
 *   400 #93A47C   secondary accents
 *   600 #5F7052   active accents / focus ring
 *   800 #37402F   primary text
 */
export default function DesktopWindow({ open, onClose, title, children, width = 600 }) {
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  const draggleRef = useRef(null)

  // Keeps the window from being dragged fully off-screen — recalculated
  // relative to the viewport each time a drag starts.
  const onDragStart = (_event, uiData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const targetRect = draggleRef.current?.getBoundingClientRect()
    if (!targetRect) return
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y)
    })
  }

  const toggleMaximize = () => {
    setMaximized((prev) => !prev)
    setMinimized(false)
  }

  const toggleMinimize = () => setMinimized((prev) => !prev)

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered={!maximized}
      mask={false}
      closable={false}
      width={maximized ? '100vw' : width}
      rootClassName="desktop-window-root"
      // AntD's Modal is portalled to document.body, so it can't be dragged by
      // wrapping <Modal> itself in <Draggable>. modalRender hands us the real
      // modal panel node so Draggable can move the thing that's actually on screen.
      modalRender={(node) =>
        maximized ? (
          node
        ) : (
          <Draggable
            handle=".desktop-window-titlebar"
            bounds={bounds}
            nodeRef={draggleRef}
            onStart={onDragStart}
          >
            <div ref={draggleRef}>{node}</div>
          </Draggable>
        )
      }
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
          borderRadius: maximized ? 0 : 12,
          border: '1px solid #D2DAC4',
          boxShadow: '0 20px 45px -12px rgba(55, 64, 47, 0.35)'
        },
        // AntD's default .ant-modal-body padding (24px) was stacking on top
        // of our own padding below — zero it out since we control spacing ourselves.
        body: { padding: 0 },
        // Newer antd exposes the outer wrap/container as a styleable slot too.
        wrapper: { padding: 0 }
      }}
    >
      {/*
        Belt-and-braces fallback: antd's own .ant-modal-wrap / .ant-modal-container
        (the portal element that positions the modal on screen, one level up
        from .ant-modal-content) ships with default padding for its centering/
        scroll behavior. The `styles.wrapper` prop above covers current antd
        versions; this scoped rule — keyed to rootClassName so it can't leak
        into the rest of the app — covers older ones too.
      */}
      <style>{`
        .desktop-window-root.ant-modal-wrap,
        .desktop-window-root .ant-modal-container,
        .desktop-window-root.ant-modal-root .ant-modal-wrap {
          padding: 0 !important;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #d9d9d9;
        }
      `}</style>
      {/* Title bar — drag handle */}
      <div className="desktop-window-titlebar border flex items-center justify-between border-b bg-gradient-to-b from-white to-gray-100 border-gray-300 select-none px-2 py-1 border-t-0 border-r-0 border-l-0 active:cursor-grabbing">
        <span className="select-none truncate text-md tracking-tight text-[#37402F] font-black">
          {title}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMinimize}
            aria-label="Minimize"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#5F7052] transition-colors hover:bg-[#E7EBE0] hover:text-[#37402F]"
          >
            <MinusOutlined style={{ fontSize: 11 }} />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            aria-label={maximized ? 'Restore' : 'Maximize'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#5F7052] transition-colors hover:bg-[#E7EBE0] hover:text-[#37402F]"
          >
            {maximized ? (
              <CompressOutlined style={{ fontSize: 11 }} />
            ) : (
              <ExpandOutlined style={{ fontSize: 11 }} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#5F7052] transition-colors hover:bg-[#B3543F] hover:text-white"
          >
            <CloseOutlined style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {/* Body — collapses when minimized */}
      {!minimized && (
        <div className="max-h-[75vh] overflow-y-auto bg-white px-4 py-3 text-[#37402F]">
          {children}
        </div>
      )}
    </Modal>
  )
}
