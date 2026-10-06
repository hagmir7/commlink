import React, { useEffect, useMemo, useState } from 'react'
import { Empty, Input, Table, message } from 'antd'
import { getClients } from '../api/client'
import { useNavigate } from 'react-router-dom'

const RESULT_COLUMNS = [
  { key: 'code', dataIndex: 'code', title: 'Code', width: 120 },
  { key: 'intitule', dataIndex: 'intitule', title: 'Intitulé' },
  { key: 'ville', dataIndex: 'ville', title: 'Ville', width: 160 }
]

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // load the full list on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getClients(0)
        if (!cancelled) setClients(data)
      } catch (err) {
        if (cancelled) return
        console.error(err)
        message.error('Erreur lors du chargement des clients')
        setClients([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // empty search -> full list
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.code, c.intitule, c.ville].some((v) => v?.toLowerCase().includes(q))
    )
  }, [clients, search])

  return (
    <div className="flex flex-col gap-3">
      <Input.Search
        placeholder="Rechercher un client (Ref, intitulé, ville)"
        allowClear
        className="px-1.5 pt-1.5"
        size="small"
        enterButton
        loading={loading}
        onChange={(e) => setSearch(e.target.value)}
        onSearch={setSearch}
      />
      <Table
        rowKey="code"
        columns={RESULT_COLUMNS}
        dataSource={results}
        pagination={false}
        size="small"
        loading={loading}
        // scroll={{ y: 320 }}
        className="whitespace-nowrap border border-solid border-b-0 rounded-none border-gray-200 overflow-hidden [&_.ant-table-thead>tr>th]:!py-1 [&_.ant-table-thead>tr>th]:!px-2 [&_.ant-table-tbody>tr>td]:!py-1 [&_.ant-table-tbody>tr>td]:!px-2 [&_.ant-table-tbody>tr>td]:text-sm"
        locale={{ emptyText: <Empty description="Aucun client trouvé" /> }}
        onRow={(record) => ({
          className: 'cursor-pointer',
          onClick: () => navigate(`/clients/${record.code}`)
        })}
      />
    </div>
  )
}
