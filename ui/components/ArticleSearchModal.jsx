import { Empty, Input, Modal, Table } from 'antd'
import { useEffect, useState } from 'react'
import { searchArticles } from '../api/article'

const RESULT_COLUMNS = [
  { key: 'articleRef', dataIndex: 'reference', title: 'Référence', width: 110 },
  { key: 'designation', dataIndex: 'designation', title: 'Désignation' },
  { key: 'couleur', dataIndex: 'couleur', title: 'Couleur', width: 120 },
  { key: 'prixUnitaire', dataIndex: 'prixUnitaire', title: 'P.U. HT', width: 90 }
]

/**
 * Modal used to complete a search when the direct reference lookup
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
    <Modal
      open={open}
      title="Rechercher un article"
      width={800}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => onConfirm(selectedRows)}
      okText={`Ajouter${selectedRows.length ? ` (${selectedRows.length})` : ''}`}
      okButtonProps={{ disabled: selectedRows.length === 0 }}
      cancelText="Annuler"
    >
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
        className="border border-solid border-gray-200 border-b-0 rounded-xl overflow-"
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
    </Modal>
  )
}
