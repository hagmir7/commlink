import { BorderOutlined, CloseOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'

export default function MinimizedDocumentBar() {
  const [searchParams] = useSearchParams()
  const piece = searchParams.get('piece')

  return (
    <div className="w-full h-screen flex items-center bg-gradient-to-b from-white to-gray-100 border border-gray-300 shadow-lg select-none">
      <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold shrink-0">
          C
        </span>

        <span className="text-[12px] font-semibold text-gray-800 truncate">Document {piece}</span>
      </div>

      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          onClick={() => window.api?.restoreWindow()}
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          <BorderOutlined style={{ fontSize: 10 }} />
        </button>

        <button
          type="button"
          onClick={() => window.api?.closeWindow()}
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-red-500 hover:text-white"
        >
          <CloseOutlined style={{ fontSize: 10 }} />
        </button>
      </div>
    </div>
  )
}
