import React, { useState } from 'react'
import { Button, Table } from 'antd'
import { Panel } from './primitives'

export default function LivraisonsTab({ livraisons }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  if (!livraisons || !livraisons.items) {
    return (
      <Panel>
        <div className="p-4 text-gray-500">Aucune livraison disponible.</div>
      </Panel>
    )
  }

  // Exact columns from the screenshot
  const columns = [
    { title: 'Intitulé du lieu de livraison', dataIndex: 'intitule', key: 'intitule', width: 200 },
    { title: 'Code postal', dataIndex: 'codePostal', key: 'codePostal', width: 90 },
    { title: 'Ville', dataIndex: 'ville', key: 'ville', width: 120 },
    { title: 'Contact', dataIndex: 'contact', key: 'contact', width: 120 },
    { title: 'Téléphone', dataIndex: 'telephone', key: 'telephone', width: 110 },
    { title: 'Adresse', dataIndex: 'adresse', key: 'adresse', width: 180 },
    { title: 'Complément', dataIndex: 'complement', key: 'complement', width: 150 }
  ]

  // Single row selection matching standard Windows listviews
  const rowSelection = {
    type: 'radio',
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys)
  }

  return (
    <Panel>
      <div className="flex gap-2 pt-2 h-[500px]">
        {' '}
        {/* Fixed height to force internal scrollbars */}
        {/* Main Table Area */}
        <div className="flex-1 min-w-0 border border-solid border-gray-300 rounded-md overflow-hidden bg-white">
          <Table
            size="small"
            rowSelection={rowSelection}
            columns={columns}
            dataSource={livraisons.items}
            rowKey="no"
            pagination={false}
            scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
            className="
                whitespace-nowrap
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
        </div>
        {/* Right Side Action Buttons */}
        <div className="flex flex-col gap-1 w-[90px] shrink-0 pt-1">
          <Button size="small" disabled={selectedRowKeys.length === 0} className="w-full">
            Ouvrir...
          </Button>

          <Button
            size="small"
            className="w-full border-[#0078d7] text-[#0069bb] hover:bg-[#e8f3ff]"
          >
            Ajouter...
          </Button>

          <Button size="small" disabled={selectedRowKeys.length === 0} className="w-full">
            Supprimer
          </Button>
        </div>
      </div>
    </Panel>
  )
}
