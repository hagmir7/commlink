import React, { useEffect, useRef, useState } from 'react'
import { Empty, Input, Table, message } from 'antd'
import { searchArticles } from '../api/article'
import { useNavigate } from 'react-router-dom'

const RESULT_COLUMNS = [
  { key: 'reference', dataIndex: 'reference', title: 'Référence', width: 110 },
  { key: 'designation', dataIndex: 'designation', title: 'Désignation' },
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
    <div className="flex flex-col gap-3">
      <Input.Search
        placeholder="Rechercher un article"
        allowClear
        size="small"
        className="px-2 pt-2"
        enterButton
        loading={loading}
        onSearch={runSearch}
      />
      <Table
        rowKey="reference"
        columns={RESULT_COLUMNS}
        dataSource={results}
        pagination={false}
        size="small"
        loading={loading}
        // scroll={{ y: 1000 }}
        className="whitespace-nowrap border border-solid border-gray-200 rounded-xl overflow-hidden [&_.ant-table-thead>tr>th]:!py-1 [&_.ant-table-thead>tr>th]:!px-2 [&_.ant-table-tbody>tr>td]:!py-1 [&_.ant-table-tbody>tr>td]:!px-2 [&_.ant-table-tbody>tr>td]:text-sm"
        locale={{ emptyText: <Empty description="Aucun article trouvé" /> }}
        onRow={(record) => ({
          className: 'cursor-pointer',
          onClick: () => navigate(`/articles/${record.reference}`)
        })}
      />
    </div>
  )
}
