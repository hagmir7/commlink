import React, { forwardRef, useState } from 'react'
import { Dropdown } from 'antd'
import {
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  DownOutlined,
  PrinterOutlined,
  CalculatorOutlined,
  SwapOutlined,
  LockOutlined,
  CaretDownOutlined,
  TruckOutlined,
  WhatsAppOutlined,
  MailOutlined,
  FilePdfOutlined
} from '@ant-design/icons'

import DesktopWindow from './ui/DesktopWindow'
import TransferDocument from './TransferDocument'
import PrintDocument from './PrintDocument'
import DocumentInfoList from './DocumentInfoList'
import SolvabiliteCient from './SolvabiliteCient'
import WhatsappSendDocument from './WhatsappSendDocument'
import { api, BASE_URL } from '../utils/api'
import { DOCUMENT_TYPES } from '../constants/documentTypes'

const menuItems = [
  { key: 'info-libre', label: 'Info libre' },
  { key: 'solvabilite', label: 'Solvabilité' }
]

const printMenuItems = [
  {
    key: 'whatsapp',
    icon: <WhatsAppOutlined style={{ color: '#25D366' }} />,
    label: <span className="text-xs">Envoyer par WhatsApp</span>,
    size: 'small'
  },
  {
    key: 'mail',
    icon: <MailOutlined style={{ color: 'blue' }} />,
    label: <span className="text-xs">Envoyer par E-mail</span>,
    size: 'small'
  },

  {
    key: 'pdf',
    icon: <FilePdfOutlined style={{ color: 'red' }} />,
    label: <span className="text-xs">Voir PDF</span>,
    size: 'small'
  }
]

const ToolbarButton = forwardRef(function ToolbarButton(
  { icon, label, disabled = false, onClick, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      {...rest}
      className={[
        'flex flex-col items-center justify-center gap-0.5 px-2.5 py-1',
        'text-[11px] leading-none border-r border-gray-200 last:border-r-0',
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-blue-50 cursor-pointer'
      ].join(' ')}
      style={{ minWidth: 78 }}
    >
      <span className="text-[15px]">{icon}</span>
      <span className="flex items-center gap-0.5">
        {label}
        <DownOutlined style={{ fontSize: 8 }} />
      </span>
    </button>
  )
})

/**
 * Split button: clicking the icon/label runs `onClick`;
 * clicking the little arrow opens a dropdown menu.
 */
function SplitToolbarButton({ icon, label, disabled = false, onClick, menu }) {
  const base = disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'

  return (
    <div
      className={[
        'group flex flex-col items-center justify-center gap-0.5 px-2.5 py-1',
        'text-[11px] leading-none border-r border-gray-200 last:border-r-0',
        disabled ? 'text-gray-400' : 'text-gray-700 hover:bg-blue-50'
      ].join(' ')}
      style={{ minWidth: 78 }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`text-[12px] ${base}`}
        aria-label={label}
      >
        {icon}
      </button>

      <span className="flex items-center gap-0.5">
        <button type="button" disabled={disabled} onClick={onClick} className={`text-xs ${base}`}>
          {label}
        </button>

        <Dropdown menu={menu} trigger={['click']} disabled={disabled}>
          <button
            type="button"
            size="small"
            disabled={disabled}
            aria-label={`${label} - plus d'options`}
            className={[
              'flex h-3.5 w-4 items-center justify-center rounded-sm',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-200'
            ].join(' ')}
          >
            <DownOutlined style={{ fontSize: 8 }} />
          </button>
        </Dropdown>
      </span>
    </div>
  )
}

export default function DocumentToolbar({ document, documentType, updateDocumentStatus }) {
  const [transferOpen, setTransferOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [solvOpen, setSolvOpen] = useState(false)
  const pdfUrl = `${BASE_URL}/documents/${documentType}/${document?.piece}/pdf`

  const documentTypeLabel = DOCUMENT_TYPES.find((t) => t.type === documentType)?.label || 'Document'

  const handleMenuClick = ({ key }) => {
    if (key === 'info-libre') setInfoOpen(true)
    if (key === 'solvabilite') setSolvOpen(true)
  }

  const handlePrintMenuClick = async ({ key }) => {
    if (key === 'whatsapp') setWhatsappOpen(true)
    if (key === 'pdf') {
      if (!document?.piece) return

      try {
        const res = await api.get(`/documents/${documentType}/${document.piece}/pdf`, {
          responseType: 'blob'
        })
        const blob = new Blob([res.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } catch (err) {
        console.error('Erreur ouverture PDF', err)
      }
    }
  }

  return (
    <>
      <div className="shrink-0 flex items-stretch bg-white border-b border-gray-300">
        <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
          <ToolbarButton disabled={!document} label="Fonctions" icon={<SettingOutlined />} />
        </Dropdown>

        <ToolbarButton icon={<BarChartOutlined />} label="Barèmes" disabled />
        <ToolbarButton icon={<InfoCircleOutlined />} label="Informations" disabled />
        <ToolbarButton icon={<CaretDownOutlined />} label="Pied" disabled />

        {/* Click = print · arrow = more options (WhatsApp) */}
        <SplitToolbarButton
          icon={<PrinterOutlined />}
          label="Imprimer"
          disabled={!document}
          onClick={() => setPrintOpen(true)}
          menu={{ items: printMenuItems, onClick: handlePrintMenuClick }}
        />

        <ToolbarButton icon={<CalculatorOutlined />} label="Comptabiliser" disabled />

        <ToolbarButton
          icon={<SwapOutlined />}
          label="Transformer"
          onClick={() => setTransferOpen(true)}
          disabled={!document}
        />

        <ToolbarButton icon={<LockOutlined />} label="Valider" disabled />
        <ToolbarButton icon={<TruckOutlined />} label="Expédition" />
      </div>

      <DesktopWindow
        open={transferOpen}
        title="Transformer le document"
        onClose={() => setTransferOpen(false)}
        width={400}
        height={450}
      >
        <TransferDocument
          currentDocumentType={documentType}
          document={document}
          setOpen={setTransferOpen}
        />
      </DesktopWindow>

      <DocumentInfoList
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        docType={documentType}
        docNumber={document?.piece}
      />

      <SolvabiliteCient
        open={solvOpen}
        onClose={() => setSolvOpen(false)}
        clientCode={document?.clientCode ?? document?.client?.code}
      />

      <PrintDocument
        open={printOpen}
        onCancel={() => setPrintOpen(false)}
        pdfUrl={pdfUrl}
        documentName={document?.piece}
      />

      <WhatsappSendDocument
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        onSend={updateDocumentStatus}
        pdfUrl={pdfUrl}
        fileName={document?.piece ? `${documentTypeLabel}-${document.piece}` : undefined}
        defaultPhone={document?.clientTelephone ?? ''}
      />
    </>
  )
}
