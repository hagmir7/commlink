import React, { useEffect, useRef, useState } from 'react'
import { Button, Empty, Input, Table, message } from 'antd'
import { searchArticles } from '../api/article'
import { useNavigate } from 'react-router-dom'
import ArticleImagePreview from './ArticleImagePreview'

const RESULT_COLUMNS = [
  {
    key: 'reference',
    dataIndex: 'reference',
    title: 'Référence',
    width: 110,
    render: (text, record) => (
      <ArticleImagePreview reference={record.reference}>{text}</ArticleImagePreview>
    )
  },
  {
    key: 'designation',
    dataIndex: 'designation',
    title: 'Désignation',
    render: (text, record) => (
      <ArticleImagePreview reference={record.reference}>{text}</ArticleImagePreview>
    )
  },
  {
    key: 'prixVent',
    dataIndex: 'prixVent',
    title: 'P.U. HT',
    width: 90,
    align: 'right',
    render: (v) => (v == null ? '' : Number(v).toFixed(2))
  }
]

export default function Articles() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const navigate = useNavigate()
  const close = () => {
    if (window.api) window.api.closeWindow()
    else navigate(-1)
  }

  async function runSearch(value) {
    const id = ++requestId.current
    setLoading(true)
    try {
      const data = await searchArticles(value)
      if (id !== requestId.current) return
      setResults(data)
    } catch (err) {
      if (id !== requestId.current) return
      console.error(err)
      message.error('Erreur lors de la recherche')
      setResults([])
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    runSearch('')
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-2 pb-3 pt-2">
        <Input.Search
          placeholder="Rechercher un article"
          allowClear
          size="small"
          enterButton
          loading={loading}
          onSearch={runSearch}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table
          rowKey="reference"
          columns={RESULT_COLUMNS}
          dataSource={results}
          pagination={false}
          size="small"
          loading={loading}
          className="whitespace-nowrap border border-solid border-gray-200 rounded-xl overflow-hidden [&_.ant-table-thead>tr>th]:!py-1 [&_.ant-table-thead>tr>th]:!px-2 [&_.ant-table-tbody>tr>td]:!py-1 [&_.ant-table-tbody>tr>td]:!px-2 [&_.ant-table-tbody>tr>td]:text-sm"
          locale={{ emptyText: <Empty description="Aucun article trouvé" /> }}
          onRow={(record) => ({
            className: 'cursor-pointer',
            onClick: () => navigate(`/articles/${record.reference}`)
          })}
        />
      </div>
      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2">
        <Button size="small" type="primary" onClick={close}>
          OK
        </Button>
        <Button size="small" onClick={close}>
          Annuler
        </Button>
      </footer>
    </div>
  )
}
