import { useCallback, useRef, useState } from 'react'

/**
 * Queue of "stock unavailable" items, shown one modal step at a time.
 * onDone(results) runs when the queue ends (last OK, or the user closes it).
 */
export default function useUnavailabilityQueue(onDone) {
  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const resultsRef = useRef([])

  // Returns false when there is nothing to show
  const start = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return false
    resultsRef.current = []
    setItems(list)
    setIndex(0)
    setOpen(true)
    return true
  }, [])

  const finish = () => {
    const results = resultsRef.current
    setOpen(false)
    setItems([])
    setIndex(0)
    onDone?.(results)
  }

  const handleOk = (values) => {
    resultsRef.current[index] = values
    if (index + 1 < items.length) setIndex(index + 1)
    else finish()
  }

  return {
    start,
    index, // use it as `key` so the modal remounts for each item
    modalProps: {
      open,
      onOk: handleOk,
      onClose: finish,
      unvilableData: items[index] ?? null,
      current: index + 1,
      total: items.length
    }
  }
}
