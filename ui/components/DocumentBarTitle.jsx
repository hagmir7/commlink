import { BorderOutlined, CloseOutlined, MinusOutlined } from '@ant-design/icons'

export default function DocumentBarTitle({ piece, document }) {
  return (
    <div
      className="shrink-0 h-8 flex items-center justify-between bg-gradient-to-b from-white to-gray-100 border-b border-gray-300 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-2 px-2 min-w-0">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold shrink-0">
          C
        </span>

        {piece ? (
          <span className="text-[13px] text-gray-800 font-semibold truncate">
            Bon de commande : {document?.statut ?? 'Chargement...'} N° {piece}{' '}
            {document?.clientCode ?? ''} {document?.clientIntitule ?? ''}
          </span>
        ) : (
          <span className="text-[13px] text-gray-800">Nouveau Devis</span>
        )}
      </div>

      <div className="flex items-center h-full shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          onClick={() => window.api?.minimizeWindow(piece)}
          className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          <MinusOutlined style={{ fontSize: 11 }} />
        </button>

        <button
          type="button"
          onClick={() => window.api?.maximizeWindow()}
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
