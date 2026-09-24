import React from 'react'
import { Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { DOCUMENT_TYPES, STATUT_COLORS } from '../constants/documentTypes'
import { Printer, Settings } from 'lucide-react'

function TypeBadge({ type }) {
  const config = DOCUMENT_TYPES.find((d) => d.type === type)
  if (!config) return null
  return (
    <span
      className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: config.color }}
    >
      {config.code}
    </span>
  )
}

function formatMoney(value) {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DocumentsTable({
  documents,
  documentType,
  loading,
  selectedRowKey,
  onSelectRow,
  onOpenRow
}) {
  const columns = [
    { title: 'Type', key: 'type', width: 50, render: () => <TypeBadge type={documentType} /> },
    {
      title: 'Etat',
      key: 'etat',
      width: 40,
      render: (_, row) => (
        <div className="flex gap-1 text-[10px] text-gray-500">
          {row.imprime ? (
            <span title="Imprimé">
              <Printer size={15} />
            </span>
          ) : (
            ''
          )}
          {row.reliquat ? (
            <span title="Reliquat">
              <Settings size={15} />
            </span>
          ) : (
            ''
          )}
        </div>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 120,
      render: (statut) => (
        <Tag color={STATUT_COLORS[statut] || 'default'} className="!m-0">
          {statut}
        </Tag>
      )
    },
    { title: 'N° pièce', dataIndex: 'piece', key: 'piece', width: 130 },
    { title: 'Référence', dataIndex: 'ref', key: 'ref', width: 140 },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 90,
      render: (d) => (d ? dayjs(d).format('DDMMYY') : '')
    },
    { title: 'N° client', dataIndex: 'clientCode', key: 'clientCode', width: 100 },
    // { title: 'Hors taxe', dataIndex: 'totalHT', key: 'totalHT', width: 110, align: 'right', render: formatMoney },
    {
      title: 'Hors taxe',
      key: 'totalHT',
      width: 110,
      align: 'right',
      render: (_, row) => formatMoney((row.netAPayer || 0) - (row.montantRegle || 0))
    },
    { title: 'Intitulé client', dataIndex: 'clientIntitule', key: 'clientIntitule', width: 220 }
  ]

  return (
    <Table
      size="small"
      rowKey="piece"
      loading={loading}
      columns={columns}
      dataSource={documents}
      pagination={false}

      scroll={{ x: 'max-content', y: 'calc(100vh - 260px)' }}
      onRow={(row) => ({
        onClick: () => onSelectRow(row.piece),
        onDoubleClick: () => onOpenRow(row),
        className: row.piece === selectedRowKey ? '!bg-blue-50 cursor-pointer' : 'cursor-pointer'
      })}
      className="
        h-full whitespace-nowrap
      [&_.ant-table-thead_.ant-table-cell]:bg-[#f0f0f0]
        [&_.ant-table-thead_.ant-table-cell]:text-[12px] 

        [&_.ant-table-tbody_.ant-table-cell]:py-1
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
    />
  )
}
