import { useEffect, useState } from 'react'
import { Table, Alert, Button, message } from 'antd'
import { formatAmount } from '../utils/helpers'
import DesktopWindow from './ui/DesktopWindow'
import { api } from '../utils/api'
import { DOCUMENT_TYPES } from '../constants/documentTypes'

const columns = [
  {
    title: 'Pièce',
    dataIndex: 'piece',
    key: 'piece',
    render: (value) => value || '—'
  },
  {
    title: 'Référence',
    dataIndex: 'reference',
    key: 'reference',
    render: (value) => value || '—'
  },
  {
    title: 'Total HT',
    dataIndex: 'totalHT',
    key: 'totalHT',
    align: 'right',
    render: formatAmount
  },
  {
    title: 'Total TTC',
    dataIndex: 'totalTTC',
    key: 'totalTTC',
    align: 'right',
    render: formatAmount
  },
  {
    title: 'Net à payer',
    dataIndex: 'netAPayer',
    key: 'netAPayer',
    align: 'right',
    render: (value) => <span className="font-black text-[#37402F]">{formatAmount(value)}</span>
  }
]

export default function DocumentIntegrationModal({
  open,
  onClose,
  onIntegrated, // optional: called after a successful integration (e.g. to refetch the document)
  targetType, // e.g. "DocumentTypeVenteCommande"
  targetPiece, // e.g. "26BC000358"
  width = 900,
  document
}) {
  const [documents, setDocuments] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || !targetType || !targetPiece) return

    let cancelled = false

    const fetchDocuments = async () => {
      setLoading(true)
      setError(null)
      setSelectedKeys([])
      try {
        const res = await api.get(
          `/documents/${encodeURIComponent(targetType)}/${encodeURIComponent(
            targetPiece
          )}/integrable-documents`
        )
        if (!cancelled) setDocuments(res.data?.documents ?? [])
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || 'Impossible de charger les documents.'
          )
          setDocuments([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDocuments()

    return () => {
      cancelled = true
    }
  }, [open, targetType, targetPiece, reloadKey])

  const handleOk = async () => {
    if (submitting) return

    // Build the payload from the selected rows, keeping the original order
    const sources = documents
      .filter((doc) => selectedKeys.includes(doc.piece))
      .map(({ piece, type }) => ({
        piece,
        type: DOCUMENT_TYPES.find((t) => t.value === Number(type))?.type
      }))

    if (sources.length === 0) {
      message.warning('Sélectionnez au moins un document')
      return
    }

    setSubmitting(true)
    console.log('Integrating documents:', sources)
    try {
      await api.post(
        `/documents/${encodeURIComponent(targetType)}/${encodeURIComponent(targetPiece)}/integrate`,
        { sources }
      )
      message.success('Documents intégrés avec succès')
      onIntegrated?.()
      onClose()
    } catch (err) {
      const errorData = err?.response?.data

      if (window.api && window.api.showError) {
        window.api.showError(
          errorData?.title ||
            errorData?.detail ||
            errorData?.message ||
            "Erreur lors de l'intégration"
        )
      } else {
        message.error(
          errorData?.title ||
            errorData?.detail ||
            errorData?.message ||
            "Erreur lors de l'intégration"
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DesktopWindow
      open={open}
      onClose={submitting ? undefined : onClose}
      title={`Documents à integrer : ${document?.clientCode} ${document?.clientIntitule} `}
      width={width}
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          title="Erreur"
          description={error}
          action={
            <Button size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Réessayer
            </Button>
          }
        />
      ) : (
        <>
          <Table
            size="small"
            rowKey="piece"
            columns={columns}
            dataSource={documents}
            loading={loading}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: setSelectedKeys
            }}
            className="[&_.ant-table-thead>tr>th]:!py-1 [&_.ant-table-thead>tr>th]:!px-2 [&_.ant-table-tbody>tr>td]:!py-1 [&_.ant-table-tbody>tr>td]:!px-2 [&_.ant-table-tbody>tr>td]:text-sm"
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Aucun document trouvé.' }}
          />

          <div className="mt-3 py-2 px-2 flex items-center justify-between">
            <span className="text-xs text-[#5F7052]">
              {selectedKeys.length} document{selectedKeys.length > 1 ? 's' : ''} sélectionné
              {selectedKeys.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                size="small"
                type="primary"
                onClick={handleOk}
                loading={submitting}
                disabled={selectedKeys.length === 0 || loading || submitting}
              >
                OK
              </Button>
              <Button size="small" onClick={onClose} disabled={submitting}>
                Annuler
              </Button>
            </div>
          </div>
        </>
      )}
    </DesktopWindow>
  )
}
