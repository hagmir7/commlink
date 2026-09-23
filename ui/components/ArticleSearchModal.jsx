import { Button, Empty, Input, Table } from 'antd'
import { useEffect, useState } from 'react'
import { searchArticles } from '../api/article'
import DesktopWindow from './ui/DesktopWindow'
// import DesktopWindow from './DesktopWindow' // adjust import path to match your project

const RESULT_COLUMNS = [
  { key: 'articleRef', dataIndex: 'reference', title: 'Référence', width: 110 },
  { key: 'designation', dataIndex: 'designation', title: 'Désignation' },
  // { key: 'couleur', dataIndex: 'couleur', title: 'Couleur', width: 120 },
  { key: 'prixUnitaire', dataIndex: 'prixVent', title: 'P.U. HT', width: 90 }
]

/**
 * Window used to complete a search when the direct reference lookup
 * returns no result (or is manually opened). Supports selecting
 * several articles at once before adding them to the lines table.
 */
export default function ArticleSearchModal({ open, initialQuery = '', onCancel, onConfirm }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])

  useEffect(() => {
    if (!open) return
    setQuery(initialQuery)
    setSelectedRows([])
    setResults([])
    if (initialQuery) {
      runSearch(initialQuery)
    }
  }, [open, initialQuery])

  async function runSearch(value) {
    if (!value?.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await searchArticles(value.trim())
      setResults(data.map((article) => ({ ...article, key: article.reference })))
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys: selectedRows.map((row) => row.key),
    onChange: (_keys, rows) => setSelectedRows(rows)
  }

  return (
    <DesktopWindow
      open={open}
      title="Rechercher un article"
      onClose={onCancel}
      width={800}
      height={1200}
    >
      <div className="flex flex-col h-full">
        <Input.Search
          autoFocus
          placeholder="Référence, désignation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={runSearch}
          loading={loading}
          className="mb-3"
        />
        <div className="p-2"></div>
        <Table
          columns={RESULT_COLUMNS}
          dataSource={results}
          rowSelection={rowSelection}
          pagination={false}
          size="small"
          className="
                  whitespace-nowrap
                  border border-solid border-gray-200 border-b-0 rounded-xl
                  [&_.ant-table-content]:overflow-visible!
                  [&_.ant-table-thead>tr>th]:sticky
                  [&_.ant-table-thead>tr>th]:top-0
                  [&_.ant-table-thead>tr>th]:z-10
                  [&_.ant-table-thead>tr>th]:py-1!
                  [&_.ant-table-thead>tr>th]:!px-2
                  [&_.ant-table-tbody>tr>td]:!py-1
                  [&_.ant-table-tbody>tr>td]:!px-2
                  [&_.ant-table-tbody>tr>td]:overflow-hidden
                  [&_.ant-table-tbody>tr>td]:text-ellipsis
                  [&_.ant-table-tbody>tr>td]:text-sm
                "
          loading={loading}
          scroll={{ y: 320 }}
          locale={{ emptyText: <Empty description="Aucun article trouvé" /> }}
          onRow={(record) => ({
            onClick: () => {
              const alreadySelected = selectedRows.some((row) => row.key === record.key)
              setSelectedRows(
                alreadySelected
                  ? selectedRows.filter((row) => row.key !== record.key)
                  : [...selectedRows, record]
              )
            }
          })}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button size="small" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="primary"
            size="small"
            disabled={selectedRows.length === 0}
            onClick={() => onConfirm(selectedRows)}
          >
            {`Ajouter${selectedRows.length ? ` (${selectedRows.length})` : ''}`}
          </Button>
        </div>
      </div>
    </DesktopWindow>
  )
}
