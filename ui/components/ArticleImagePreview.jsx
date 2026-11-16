/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import { Carousel, Popover } from 'antd'
import { getProductImages } from '../api/productImages'

// Verify that the actual image loads before displaying any popup.
function preloadImage(image) {
  return new Promise((resolve) => {
    const preview = new window.Image()
    const finish = (loaded) => {
      clearTimeout(timeout)
      preview.onload = null
      preview.onerror = null
      resolve(loaded ? image : null)
    }
    const timeout = setTimeout(() => finish(false), 10000)
    preview.onload = () => finish(true)
    preview.onerror = () => finish(false)
    preview.referrerPolicy = 'no-referrer'
    preview.src = image.url
  })
}

export default function ArticleImagePreview({ reference, children }) {
  const code = String(reference ?? '').trim()
  const [result, setResult] = useState({ code: '', images: [] })
  const [visible, setVisible] = useState(false)
  const enterTimer = useRef(null)
  const leaveTimer = useRef(null)
  const requestId = useRef(0)

  useEffect(() => {
    return () => {
      clearTimeout(enterTimer.current)
      clearTimeout(leaveTimer.current)
      requestId.current += 1
    }
  }, [code])

  const keepOpen = () => clearTimeout(leaveTimer.current)

  const handleEnter = () => {
    keepOpen()
    clearTimeout(enterTimer.current)
    const current = ++requestId.current
    enterTimer.current = setTimeout(async () => {
      try {
        const images = await getProductImages(code)
        if (requestId.current !== current) return
        const loaded = (await Promise.all(images.map(preloadImage))).filter(Boolean)
        if (requestId.current !== current) return
        setResult({ code, images: loaded })
        setVisible(loaded.length > 0)
      } catch {
        if (requestId.current === current) setVisible(false)
      }
    }, 800)
  }

  const handleLeave = () => {
    clearTimeout(enterTimer.current)
    requestId.current += 1
    clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => setVisible(false), 200)
  }

  if (!code) return children
  const images = result.code === code ? result.images : []

  return (
    <Popover
      trigger={[]}
      placement="right"
      open={visible && images.length > 0}
      styles={{ body: { padding: 0, overflow: 'hidden' } }}
      content={
        images.length > 0 ? (
          <div
            className="w-[300px] overflow-hidden rounded-lg bg-white"
            onMouseEnter={keepOpen}
            onMouseLeave={handleLeave}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label="Images de l'article"
          >
            <Carousel
              key={code}
              arrows={images.length > 1}
              dots={images.length > 1}
              infinite
              className="[&_.slick-arrow]:!text-gray-600 [&_.slick-dots_button]:!bg-gray-500"
            >
              {images.map((image) => (
                <div key={image.id ?? image.url}>
                  <img
                    src={image.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="block h-[260px] w-full object-contain"
                  />
                </div>
              ))}
            </Carousel>
          </div>
        ) : null
      }
    >
      <span
        className="inline-block max-w-full"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </span>
    </Popover>
  )
}
