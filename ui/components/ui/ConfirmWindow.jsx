import { useCallback, useRef, useState } from 'react'
import { Modal, Button } from 'antd'
import { CloseOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import Draggable from 'react-draggable'

/**
 * ConfirmWindow: a draggable confirm dialog styled like DesktopWindow.
 * onOk may be async; the OK button shows a loading state until it resolves.
 * If onOk throws, the window stays open.
 */
export function ConfirmWindow({
  open,
  onClose,
  afterClose,
  title = 'Confirmer ?',
  content,
  icon,
  okText = 'Confirmer',
  cancelText = 'Annuler',
  danger = false,
  onOk,
  onCancel,
  width = 360
}) {
  const [loading, setLoading] = useState(false)
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 })
  const draggleRef = useRef(null)

  const onDragStart = (_e, uiData) => {
    const { clientWidth, clientHeight } = window.document.documentElement
    const rect = draggleRef.current?.getBoundingClientRect()
    if (!rect) return
    setBounds({
      left: -rect.left + uiData.x,
      right: clientWidth - (rect.right - uiData.x),
      top: -rect.top + uiData.y,
      bottom: clientHeight - (rect.bottom - uiData.y)
    })
  }

  const handleOk = async () => {
    try {
      setLoading(true)
      await onOk?.()
      onClose?.()
    } catch (err) {
      console.error(err) // keep the window open on failure
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (loading) return
    try {
      await onCancel?.()
    } catch (err) {
      console.error(err)
      return
    }
    onClose?.()
  }

  const accent = danger ? '#B3543F' : '#5F7052'

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      afterClose={afterClose}
      footer={null}
      centered
      mask={false}
      closable={false}
      keyboard={!loading}
      width={width}
      rootClassName="confirm-window-root"
      modalRender={(node) => (
        <Draggable
          handle=".confirm-window-titlebar"
          bounds={bounds}
          nodeRef={draggleRef}
          onStart={onDragStart}
        >
          <div ref={draggleRef}>{node}</div>
        </Draggable>
      )}
      styles={{
        content: {
          padding: 0,
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid #D2DAC4',
          boxShadow: '0 20px 45px -12px rgba(55, 64, 47, 0.35)'
        },
        body: { padding: 0 },
        wrapper: { padding: 0 }
      }}
    >
      <style>{`
        .confirm-window-root .ant-modal-container,
        .confirm-window-root.ant-modal-wrap,
        .confirm-window-root.ant-modal-root .ant-modal-wrap {
          padding: 0 !important;
        }
        .confirm-window-root .ant-modal-container,
        .confirm-window-root .ant-modal-content {
          border-radius: 12px !important;
          overflow: hidden;
          background: #fff;
        }
      `}</style>

      <div className="confirm-window-titlebar flex select-none items-center justify-between border-b border-gray-300 bg-gradient-to-b from-white to-gray-100 px-2 py-1 active:cursor-grabbing">
        <span className="truncate text-md font-black tracking-tight text-[#37402F]">{title}</span>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#5F7052] transition-colors hover:bg-[#B3543F] hover:text-white disabled:opacity-50"
        >
          <CloseOutlined style={{ fontSize: 11 }} />
        </button>
      </div>

      <div className="flex items-start gap-3 bg-white px-4 py-4 text-[#37402F]">
        <span style={{ color: accent, fontSize: 18, lineHeight: 1 }}>
          {icon ?? <ExclamationCircleFilled />}
        </span>
        <div className="text-[13px] leading-relaxed">{content}</div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[#D2DAC4] bg-[#F4F6F1] px-3 py-2">
        <Button size="small" onClick={handleCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          size="small"
          type="primary"
          danger={danger}
          loading={loading}
          onClick={handleOk}
          style={danger ? undefined : { backgroundColor: '#5F7052' }}
        >
          {okText}
        </Button>
      </div>
    </Modal>
  )
}

/**
 * useConfirm: imperative-style API with a queue.
 *
 * const [confirm, confirmHolder] = useConfirm()
 * confirm({ title, content, okText, danger, onOk, onCancel })
 * ...and render {confirmHolder} once in your component's JSX.
 *
 * Calling confirm() while a dialog is open queues the next one — it will
 * open automatically once the current dialog has fully finished closing.
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, config: {} })
  const queueRef = useRef([])

  const confirm = useCallback((options) => {
    setState((prev) => {
      if (prev.open) {
        // queue it — shown when the current dialog finishes closing
        queueRef.current.push(options)
        return prev
      }
      return { open: true, config: options }
    })
  }, [])

  const handleClose = useCallback(() => {
    setState({ open: false, config: {} })
  }, [])

  const handleAfterClose = useCallback(() => {
    const next = queueRef.current.shift()
    if (next) {
      setState({ open: true, config: next })
    }
  }, [])

  const holder = (
    <ConfirmWindow
      {...state.config}
      open={state.open}
      onClose={handleClose}
      afterClose={handleAfterClose}
    />
  )

  return [confirm, holder]
}
