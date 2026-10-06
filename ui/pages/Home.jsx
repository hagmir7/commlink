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
import { useConfirm } from '../components/ui/ConfirmWindow'
import { message } from 'antd'

const POLL_INTERVAL_MS = 30_000

export default function Home() {
  const navigate = useNavigate()
  const [confirm, confirmHolder] = useConfirm()

  // --- filters ----------------------------------------------------------
  const [documentType, setDocumentType] = useState(DEFAULT_DOCUMENT_TYPE)
  const [clientCode, setClientCode] = useState(null)
  const [dateRange, setDateRange] = useState(['', ''])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSelectTypeOpen, setIsSelectTypeOpen] = useState(false)

  // --- sorting + pagination --------------------------------------------
  const [sortOrder, setSortOrder] = useState('')
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

  // --- debounce the search box -----------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // --- fetch documents whenever filters / sort / page change, + poll ---
  useEffect(() => {
    let isCancelled = false
    let inFlight = false

    async function loadDocuments({ silent = false } = {}) {
      if (inFlight) return
      inFlight = true

      if (!silent) setLoading(true)

      try {
        const params = { page, pageSize }

        if (documentType) {
          params.doType = documentType.value
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

    loadDocuments()

    const intervalId = setInterval(() => loadDocuments({ silent: true }), POLL_INTERVAL_MS)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [documentType, clientCode, dateRange, debouncedSearch, sortOrder, page, pageSize, reloadKey])

  // --- handlers --------------------------------------------------------
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

  // --- delete ----------------------------------------------------------
  const handleDelete = async (key) => {
    if (!key) return
    try {
      await api.delete(`/documents/${documentType.type}/${key}/delete`)
      setSelectedRowKey(null)
      setReloadKey((k) => k + 1)
      message.success('Document supprimé')
    } catch (error) {
      message.error(error?.response?.data?.message || 'Échec de la suppression du document')
      console.error('Failed to delete document:', error)
      throw error
    }
  }

  // --- revert ----------------------------------------------------------
  const handleRevert = async (key) => {
    if (!key) return
    try {
      await api.post(`/documents/${documentType.type}/${key}/transform/revert`)
      setSelectedRowKey(null)
      setReloadKey((k) => k + 1)
      message.success('Document rétabli')
    } catch (error) {
      message.error(error?.response?.data?.message || 'Échec du rétablissement du document')
      console.error('Failed to revert document:', error)
      throw error
    }
  }

  // --- can-revert check ------------------------------------------------
  const checkCanRevert = async (key) => {
    if (!key) return false
    try {
      const res = await api.get(`/documents/${documentType.type}/${key}/transform/can-revert`)
      return res.data?.canRevert ?? false
    } catch (error) {
      console.error('Failed to check if document can be reverted:', error)
      return false
    }
  }

  // --- STEP 1: delete confirmation ------------------------------------
  const showDeleteConfirm = () => {
    if (!selectedRowKey) return

    const key = selectedRowKey

    confirm({
      title: 'Supprimer ce document ?',
      content: `Voulez-vous supprimer l’élément ${key} ?`,
      okText: 'Oui',
      cancelText: 'Annuler',
      danger: true,
      onOk: async () => {
        const canRevert = await checkCanRevert(key)

        if (canRevert) {
          // Defer so the first dialog fully unmounts before opening the second
          setTimeout(() => showRevertConfirm(key), 150)
        } else {
          await handleDelete(key)
        }
      }
    })
  }

  // --- STEP 2: revert confirmation ------------------------------------
  const showRevertConfirm = (key) => {
    if (!key) return

    confirm({
      title: 'Rétablir ce document ?',
      content: `Ce document peut être rétabli au type précédent. Voulez-vous le rétablir au lieu de le supprimer ?`,
      okText: 'Rétablir',
      cancelText: 'Supprimer',
      onOk: () => handleRevert(key),
      onCancel: () => {
        handleDelete(key)
      }
    })
  }

  // --- refresh ---------------------------------------------------------
  const handleRefresh = () => {
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
        onDelete={showDeleteConfirm}
        onClose={() => navigate(-1)}
      />

      <SelectDocumentTypeModal
        open={isSelectTypeOpen}
        onCancel={() => setIsSelectTypeOpen(false)}
      />

      {confirmHolder}
    </div>
  )
}
