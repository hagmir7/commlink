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
  TruckOutlined
} from '@ant-design/icons'

import DesktopWindow from './ui/DesktopWindow'
import TransferDocument from './TransferDocument'
import PrintDocument from './PrintDocument'
import DocumentInfoList from './DocumentInfoList'
import SolvabiliteCient from './SolvabiliteCient'
import { BASE_URL } from '../utils/api'
import { DOCUMENT_TYPES } from '../constants/documentTypes'
// import SolvabiliteWindow from './SolvabiliteWindow'

const menuItems = [
  { key: 'info-libre', label: 'Info libre' },
  { key: 'solvabilite', label: 'Solvabilité' }
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

export default function DocumentToolbar({ document, documentType }) {
  const [transferOpen, setTransferOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [solvOpen, setSolvOpen] = useState(false)

  const docType = DOCUMENT_TYPES.find((item) => item.type === documentType)
  // console.log(docType)
  const handleMenuClick = ({ key }) => {
    if (key === 'info-libre') setInfoOpen(true)
    if (key === 'solvabilite') setSolvOpen(true)
  }

  return (
    <>
      <div className="shrink-0 flex items-stretch bg-white border-b border-gray-300">
        <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
          <ToolbarButton label="Fonctions" icon={<SettingOutlined />} />
        </Dropdown>

        <ToolbarButton icon={<BarChartOutlined />} label="Barèmes" disabled />
        <ToolbarButton icon={<InfoCircleOutlined />} label="Informations" disabled />
        <ToolbarButton icon={<CaretDownOutlined />} label="Pied" disabled />

        <ToolbarButton
          icon={<PrinterOutlined />}
          onClick={() => setPrintOpen(true)}
          label="Imprimer"
        />

        <ToolbarButton icon={<CalculatorOutlined />} label="Comptabiliser" disabled />

        <ToolbarButton
          icon={<SwapOutlined />}
          label="Transformer"
          onClick={() => setTransferOpen(true)}
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
        pdfUrl={`${BASE_URL}/documents/${documentType}/${document?.piece}/pdf`}
        documentName="Facture 123"
      />
    </>
  )
}
