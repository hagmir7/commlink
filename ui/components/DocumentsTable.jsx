import { forwardRef } from 'react'
import { Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { STATUT_COLORS } from '../constants/documentTypes'
import {
  Lock,
  Printer,
  Settings,
  FolderOpen,
  Copy,
  CopyPlus,
  Trash2,
  RotateCw
} from 'lucide-react'
import { getStatut } from '../utils/helpers'
import RightClickMenu from './ui/RightClickMenu'

function formatMoney(value) {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Menu is built per row so items can be disabled depending on the document state
function getMenuItems(row) {
  return [
    { key: 'open', label: 'Ouvrir', icon: <FolderOpen size={14} /> },
    { key: 'print', label: 'Imprimer', icon: <Printer size={14} /> },
    { key: 'copy', label: 'Copier le N° pièce', icon: <Copy size={14} /> },
    { key: 'duplicate', label: 'Dupliquer le document', icon: <CopyPlus size={14} /> },
    { key: 'transfer', label: 'Transformer le document', icon: <RotateCw size={14} /> },
    { type: 'divider' },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: !!row?.valide
    }
  ]
}

// Defined at module level so its identity is stable between renders.
// Defining it inside DocumentsTable would remount every row on each render.
const ContextRow = forwardRef(function ContextRow({ record, onContextAction, ...rest }, ref) {
  // Header/placeholder rows have no record -> plain <tr>
  if (!record) return <tr ref={ref} {...rest} />

  return (
    <RightClickMenu
      menuItems={getMenuItems(record)}
      onItemClick={(key) => onContextAction?.(key, record)}
    >
      <tr ref={ref} {...rest} />
    </RightClickMenu>
  )
})

export default function DocumentsTable({
  documents,
  documentType,
  loading,
  selectedRowKey,
  onSelectRow,
  onOpenRow,
  onContextAction // (action: 'open' | 'print' | 'copy' | 'duplicate' | 'transfer' | 'delete', row) => void
}) {
  const columns = [
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
          ) : null}
          {row.reliquat ? (
            <span title="Reliquat">
              <Settings size={15} />
            </span>
          ) : null}
          {row.valide ? (
            <span title="Valide">
              <Lock size={15} />
            </span>
          ) : null}
        </div>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 120,
      render: (_, row) => {
        // getStatut returns a full { name, value, label } object — never render it directly.
        const statutInfo = getStatut(Number(row?.type), Number(row?.statut))

        return (
          <Tag color={STATUT_COLORS[statutInfo?.name] || 'default'} className="!m-0">
            {statutInfo?.label ?? ''}
          </Tag>
        )
      }
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
    {
      title: 'Hors taxe',
      key: 'totalHT',
      width: 110,
      align: 'right',
      render: (_, row) => formatMoney((row.netAPayer || 0) - (row.montantRegle || 0))
    },
    { title: 'Intitulé client', dataIndex: 'clientIntitule', key: 'clientIntitule', width: 220 }
  ]

  const rowKey = (row) => `${row.type}-${row.piece}`

  return (
    <Table
      size="small"
      rowKey={rowKey}
      loading={loading}
      columns={columns}
      dataSource={documents}
      pagination={false}
      scroll={{ x: 'max-content', y: 'calc(115vh - 260px)' }}
      components={{ body: { row: ContextRow } }}
      onRow={(row) => ({
        record: row,
        onContextAction,
        onClick: () => onSelectRow(row.piece),
        onDoubleClick: () => onOpenRow(row),
        onContextMenu: () => onSelectRow(row.piece),
        className: row.piece === selectedRowKey ? 'selected-row cursor-pointer' : 'cursor-pointer'
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

    [&_.ant-table-tbody>tr.selected-row>td]:!bg-blue-100
    [&_.ant-table-tbody>tr.selected-row:hover>td]:!bg-blue-200
  "
    />
  )
}