import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_DOCUMENT_TYPE } from '../constants/documentTypes'
import DocumentsActionBar from '../components/DocumentsActionBar'
import DocumentsSidebar from '../components/DocumentsSidebar'
import DocumentsToolbar from '../components/DocumentsToolbar'
import DocumentsTable from '../components/DocumentsTable'
import dayjs from 'dayjs'
import { api } from '../utils/api'
import { handleShow } from '../utils/helpers'

export default function Home() {
  const navigate = useNavigate()

  const [documentType, setDocumentType] = useState(DEFAULT_DOCUMENT_TYPE)
  const [clientCode, setClientCode] = useState(null)
  const [dateRange, setDateRange] = useState([dayjs().subtract(3, 'month'), dayjs()])
  const [search, setSearch] = useState('')
  const [selectedRowKey, setSelectedRowKey] = useState(null)

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  const [clientOptions, setClientOptions] = useState([])

  // --- fetch clients once on mount ------------------------------------
  useEffect(() => {
    api
      .get(`/clients?max=1000`)
      .then((res) => {
        const opts = (res.data || []).map((c) => ({
          value: c.code,
          label: `${c.code} ${c.intitule}`
        }))
        setClientOptions(opts)
      })
      .catch((err) => console.error('Failed to load clients:', err))
  }, [])

  // --- fetch documents whenever filters change --------------------------
  useEffect(() => {
    let isCancelled = false

    async function loadDocuments() {
      setLoading(true)
      try {
        const params = {}
        if (documentType) params.type = documentType
        if (clientCode) params.clientCode = clientCode
        if (dateRange?.[0]) params.dateDebut = dateRange[0].format('YYYY-MM-DD')
        if (dateRange?.[1]) params.dateFin = dateRange[1].format('YYYY-MM-DD')

        const res = await api.get(`/documents`, { params })
        setDocuments(res.data)
      } catch (err) {
        console.error('Failed to fetch documents:', err)
        if (!isCancelled) setDocuments([])
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    loadDocuments()

    return () => {
      isCancelled = true
    }
  }, [documentType, clientCode, dateRange])

  const filteredDocuments = useMemo(() => {
    if (!search) return documents
    const q = search.toLowerCase()
    return documents.filter(
      (d) =>
        d.piece?.toLowerCase().includes(q) ||
        d.ref?.toLowerCase().includes(q) ||
        d.clientIntitule?.toLowerCase().includes(q) ||
        d.clientCode?.toLowerCase().includes(q)
    )
  }, [documents, search])

  const handleSelectType = (type) => {
    setDocumentType(type)
    setSelectedRowKey(null)
  }

  const handleOpenRow = (row) => {
    handleShow(navigate, `/documents/${row.piece}?documentType=${documentType}`)
  }

  const handleDelete = async () => {
    if (!selectedRowKey) return
    try {
      await api.delete(`/documents/${documentType}/${selectedRowKey}`)
      setSelectedRowKey(null)
      setDocumentType((t) => t)
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex flex-1">
        <DocumentsSidebar activeType={documentType} onSelect={handleSelectType} />

        <div className="flex flex-col flex-1 min-w-0">
          <DocumentsToolbar
            clientOptions={clientOptions}
            clientCode={clientCode}
            onClientChange={setClientCode}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            search={search}
            onSearchChange={setSearch}
          />

          <div className="flex-1 h-screen">
            <DocumentsTable
              documents={filteredDocuments}
              documentType={documentType}
              loading={loading}
              selectedRowKey={selectedRowKey}
              onSelectRow={setSelectedRowKey}
              onOpenRow={handleOpenRow}
            />
          </div>
        </div>
      </div>

      <DocumentsActionBar
        canOpen={!!selectedRowKey}
        canDelete={!!selectedRowKey}
        onOpen={() => {
          const row = filteredDocuments.find((d) => d.piece === selectedRowKey)
          if (row) handleOpenRow(row)
        }}
        onNouveau={() => handleShow(navigate, `/create-document?documentType=${documentType}`)}
        onDelete={handleDelete}
        onClose={() => navigate(-1)}
      />
    </div>
  )
}
