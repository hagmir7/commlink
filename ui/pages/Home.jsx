import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_DOCUMENT_TYPE } from '../constants/documentTypes'
import DocumentsActionBar from '../components/DocumentsActionBar'
import DocumentsSidebar from '../components/DocumentsSidebar'
import DocumentsToolbar from '../components/DocumentsToolbar'
import DocumentsTable from '../components/DocumentsTable'
import { api } from '../utils/api'
import { handleShow } from '../utils/helpers'
import SelectDocumentTypeModal from '../components/NewDocumentModal'

const POLL_INTERVAL_MS = 30_000

export default function Home() {
  const navigate = useNavigate()

  // --- filters ----------------------------------------------------------
  // documentType is one item of DOCUMENT_TYPES: { type, value, label, code, domain, color }
  const [documentType, setDocumentType] = useState(DEFAULT_DOCUMENT_TYPE)
  const [clientCode, setClientCode] = useState(null)
  const [dateRange, setDateRange] = useState(['', ''])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSelectTypeOpen, setIsSelectTypeOpen] = useState(false)

  // --- sorting + pagination --------------------------------------------
  const [sortOrder, setSortOrder] = useState('') // '', 'date', 'client', 'client_desc', 'statut', 'statut_desc'
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(600)
  const [totalItems, setTotalItems] = useState(0)

  // --- data -------------------------------------------------------------
  const [selectedRowKey, setSelectedRowKey] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [clientOptions, setClientOptions] = useState([])

  // --- fetch clients once on mount -------------------------------------
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

  // --- debounce the search box (server-side search) --------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // --- fetch documents whenever filters / sort / page change, + poll ----
  useEffect(() => {
    let isCancelled = false
    let inFlight = false

    async function loadDocuments({ silent = false } = {}) {
      // prevent overlapping requests (poll can fire while a slow fetch is running)
      if (inFlight) return
      inFlight = true

      // only show the spinner for user-initiated fetches, not for polls/refreshes
      if (!silent) setLoading(true)

      try {
        const params = { page, pageSize }

        // doType / doDomaine come from the selected document type
        if (documentType) {
          params.doType = documentType.value // can be 0 (Devis), so no truthy check on the value
          params.doDomaine = documentType.domain
        }
        if (clientCode) params.clientCode = clientCode
        if (debouncedSearch) params.search = debouncedSearch
        if (sortOrder) params.sortOrder = sortOrder
        if (dateRange?.[0]) params.dateFrom = dateRange[0].format('YYYY-MM-DD')
        if (dateRange?.[1]) params.dateTo = dateRange[1].format('YYYY-MM-DD')

        const res = await api.get(`/documents/short`, { params })

        if (isCancelled) return
        setDocuments(res.data.items ?? [])
        setTotalItems(res.data.totalItems ?? 0)
        // server clamps out-of-range pages, keep the UI in sync
        if (res.data.page && res.data.page !== page) setPage(res.data.page)
      } catch (err) {
        console.error('Failed to fetch documents:', err)
        if (!isCancelled) {
          setDocuments([])
          setTotalItems(0)
        }
      } finally {
        inFlight = false
        if (!isCancelled && !silent) setLoading(false)
      }
    }

    // initial fetch (with spinner)
    loadDocuments()

    // poll every 30s (silent — no spinner flash)
    const intervalId = setInterval(() => loadDocuments({ silent: true }), POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [documentType, clientCode, dateRange, debouncedSearch, sortOrder, page, pageSize, reloadKey])

  // --- handlers (each filter change goes back to page 1) ---------------
  const handleSelectType = (type) => {
    setDocumentType(type)
    setSelectedRowKey(null)
    setPage(1)
  }

  const handleClientChange = (code) => {
    setClientCode(code)
    setPage(1)
  }

  const handleDateRangeChange = (range) => {
    setDateRange(range)
    setPage(1)
  }

  const handleSortChange = (order) => {
    setSortOrder(order)
    setPage(1)
  }

  const handlePageChange = (newPage, newPageSize) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setPage(1)
    } else {
      setPage(newPage)
    }
  }

  const handleOpenRow = (row) => {
    handleShow(navigate, `/documents/${row.piece}?documentType=${documentType.type}`)
  }

  const handleDelete = async () => {
    if (!selectedRowKey) return
    try {
      await api.delete(`/documents/${documentType.type}/${selectedRowKey}`)
      setSelectedRowKey(null)
      setReloadKey((k) => k + 1)
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  // --- refresh button --------------------------------------------------
  const handleRefresh = () => {
    // bump reloadKey to trigger an immediate refetch
    setReloadKey((k) => k + 1)
  }

  // --- active filters count + clear-all --------------------------------
  const isDefaultType = documentType?.type === DEFAULT_DOCUMENT_TYPE?.type
  const hasDateFilter = !!(dateRange?.[0] || dateRange?.[1])

  const activeFilterCount =
    (isDefaultType ? 0 : 1) +
    (clientCode ? 1 : 0) +
    (hasDateFilter ? 1 : 0) +
    (debouncedSearch ? 1 : 0) +
    (sortOrder ? 1 : 0)

  const handleClearFilters = () => {
    setDocumentType(DEFAULT_DOCUMENT_TYPE)
    setClientCode(null)
    setDateRange(['', ''])
    setSearch('')
    setDebouncedSearch('')
    setSortOrder('')
    setPage(1)
    setSelectedRowKey(null)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex flex-1">
        <DocumentsSidebar activeType={documentType?.type} onSelect={handleSelectType} />

        <div className="flex flex-col flex-1 min-w-0">
          <DocumentsToolbar
            clientOptions={clientOptions}
            clientCode={clientCode}
            onClientChange={handleClientChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            search={search}
            onSearchChange={setSearch}
            // --- new props ---
            onRefresh={handleRefresh}
            activeFilterCount={activeFilterCount}
            onClearFilters={handleClearFilters}
          />

          <div className="flex-1 h-screen">
            <DocumentsTable
              documents={documents}
              documentType={documentType}
              loading={loading}
              selectedRowKey={selectedRowKey}
              onSelectRow={setSelectedRowKey}
              onOpenRow={handleOpenRow}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              pagination={{
                current: page,
                pageSize,
                total: totalItems,
                onChange: handlePageChange
              }}
            />
          </div>
        </div>
      </div>

      <DocumentsActionBar
        canOpen={!!selectedRowKey}
        canDelete={!!selectedRowKey}
        onOpen={() => {
          const row = documents.find((d) => d.piece === selectedRowKey)
          if (row) handleOpenRow(row)
        }}
        onNouveau={() => setIsSelectTypeOpen(true)}
        onDelete={handleDelete}
        onClose={() => navigate(-1)}
      />

      <SelectDocumentTypeModal
        open={isSelectTypeOpen}
        onCancel={() => setIsSelectTypeOpen(false)}
      />
    </div>
  )
}
