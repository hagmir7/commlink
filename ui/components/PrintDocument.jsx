import { PrinterOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, Select, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'

import DesktopWindow from './ui/DesktopWindow'

const LAST_PRINTER_KEY = 'lastPrinter'
const DUPLEX_KEY = 'printDuplex'

export default function PrintDocument({
  open,
  onCancel,
  onConfirm,
  pdfUrl,
  documentName = 'Document'
}) {
  const [printers, setPrinters] = useState([])
  const [printer, setPrinter] = useState()
  // Unchecked by default: one page per sheet
  const [duplex, setDuplex] = useState(() => localStorage.getItem(DUPLEX_KEY) === 'true')
  const [loadingPrinters, setLoadingPrinters] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState(null)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadPrinters() {
      setLoadingPrinters(true)
      setError(null)
      try {
        const list = await window.api.getPrinters()
        if (cancelled) return
        setPrinters(list)

        const last = localStorage.getItem(LAST_PRINTER_KEY)
        const preferred =
          list.find((p) => p.name === last) || list.find((p) => p.isDefault) || list[0]
        setPrinter(preferred?.name)
      } catch (err) {
        if (!cancelled) setError(`Impossible de charger les imprimantes : ${err.message}`)
      } finally {
        if (!cancelled) setLoadingPrinters(false)
      }
    }

    loadPrinters()
    return () => {
      cancelled = true
    }
  }, [open])

  async function handlePrint() {
    if (!pdfUrl || !printer) return
    setPrinting(true)
    setError(null)
    try {
      const result = await window.api.printPdf(pdfUrl, printer, { duplex })
      if (!result?.success) throw new Error(result?.error || 'Erreur inconnue')

      localStorage.setItem(LAST_PRINTER_KEY, printer)
      localStorage.setItem(DUPLEX_KEY, String(duplex))
      messageApi.success('Document envoyé à l’imprimante')
      onConfirm?.()
      onCancel?.()
    } catch (err) {
      setError(`Échec de l’impression : ${err.message}`)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <DesktopWindow
      open={open}
      title={`Imprimer le document ${documentName}`}
      onClose={onCancel}
      width={480}
      height={320}
    >
      {contextHolder}
      <Space orientation="vertical" size="middle" style={{ width: '100%', padding: 10 }}>
        <div>
          <Typography.Text type="secondary">Imprimante</Typography.Text>
          <Select
            style={{ width: '100%' }}
            size="small"
            placeholder="Choisir une imprimante"
            loading={loadingPrinters}
            value={printer}
            onChange={setPrinter}
            disabled={printing}
            notFoundContent="Aucune imprimante détectée"
            options={printers.map((p) => ({
              value: p.name,
              label: p.displayName || p.name
            }))}
          />
        </div>

        <div>
          <Checkbox
            checked={duplex}
            onChange={(e) => setDuplex(e.target.checked)}
            disabled={printing}
          >
            Recto verso
          </Checkbox>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {duplex
                ? 'Deux pages par feuille (recto et verso)'
                : 'Une page par feuille (recto seulement)'}
            </Typography.Text>
          </div>
        </div>

        {error && (
          <Alert type="error" title={error} showIcon closable onClose={() => setError(null)} />
        )}

        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button size="small" onClick={onCancel} disabled={printing}>
            Annuler
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            loading={printing}
            disabled={!pdfUrl || !printer}
            onClick={handlePrint}
          >
            Imprimer
          </Button>
        </Space>
      </Space>
    </DesktopWindow>
  )
}
