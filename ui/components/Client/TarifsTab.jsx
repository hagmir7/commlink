import React, { useState } from 'react'
import { Button, Input, Select, Table, Tabs } from 'antd'
import { Panel, Section, Label, Empty } from './primitives'

// Custom 4-column grid specifically for the Tarifs tab (wider labels)
const GridTarifs = ({ children }) => (
  <div className="grid grid-cols-[160px_minmax(0,1fr)_150px_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
    {children}
  </div>
)

// Mock data based on the screenshot (replace with actual API data if available)
const MOCK_REMISES_FAMILLE = [
  { key: '1', famille: 'ACC Accessoires', remise: '22,00 %' },
  { key: '2', famille: 'CAI CAISSON', remise: '10,00 %' },
  { key: '3', famille: 'FCD FACADES', remise: '30,00 %' }
]

export default function TarifsTab({ tarifs }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [activeSubTab, setActiveSubTab] = useState('famille')

  if (!tarifs)
    return (
      <Panel>
        <Empty />
      </Panel>
    )

  const t = tarifs.tarification || {}
  const r = tarifs.remises || {}

  const columns = [
    { title: 'Famille', dataIndex: 'famille', key: 'famille' },
    { title: 'Remise', dataIndex: 'remise', key: 'remise', width: 120, align: 'right' }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys)
  }

  return (
    <Panel>
      {/* ---------------- Tarification ---------------- */}
      <Section title="Tarification" />
      <GridTarifs>
        <Label>Centrale d'achat</Label>
        <Select
          size="small"
          value={t.centraleAchatIntitule || undefined}
          options={
            t.centraleAchatIntitule
              ? [{ value: t.centraleAchatIntitule, label: t.centraleAchatIntitule }]
              : []
          }
          style={{ height: 24, fontSize: 13 }}
        />

        <Label>Catégorie tarifaire</Label>
        <Select
          size="small"
          disabled
          value={t.categorieTarifaireIntitule || 'Standard'}
          options={[
            {
              value: t.categorieTarifaireIntitule || 'Standard',
              label: t.categorieTarifaireIntitule || 'Standard'
            }
          ]}
          style={{ height: 24, fontSize: 13, backgroundColor: '#e6e6e6' }}
        />

        <Label>Représentant</Label>
        <Select
          size="small"
          value={t.representantNom || undefined}
          options={
            t.representantNom ? [{ value: t.representantNom, label: t.representantNom }] : []
          }
          style={{ height: 24, fontSize: 13 }}
        />
        <div />
        <div />
      </GridTarifs>

      {/* ---------------- Remises ---------------- */}
      <Section title="Remises" />
      <GridTarifs>
        <Label>Taux de remise</Label>
        <Input
          size="small"
          readOnly
          value={r.tauxRemise != null ? `${r.tauxRemise} %` : ''}
          style={{ fontSize: 13 }}
        />

        <Label>Taux d'escompte</Label>
        <Input
          size="small"
          readOnly
          value={r.tauxEscompte != null ? `${r.tauxEscompte} %` : ''}
          style={{ fontSize: 13 }}
        />

        <Label>Taux relevé</Label>
        <Input
          size="small"
          readOnly
          value={r.tauxReleve != null ? `${r.tauxReleve} %` : ''}
          style={{ fontSize: 13 }}
        />

        <Label>Taux R.F.A.</Label>
        <Input
          size="small"
          readOnly
          value={r.tauxRFA != null ? `${r.tauxRFA} %` : ''}
          style={{ fontSize: 13 }}
        />
      </GridTarifs>

      {/* ---------------- Remises par famille ---------------- */}
      <div className="pt-4">
        <Tabs
          type="card"
          size="small"
          activeKey={activeSubTab}
          onChange={setActiveSubTab}
          tabBarStyle={{ marginBottom: 0 }}
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
          items={[
            {
              key: 'famille',
              label: 'Remise par famille',
              children: (
                <div className="flex gap-2 pt-2">
                  {/* Table */}
                  <div className="flex-1 min-w-0 border border-solid border-gray-300">
                    <Table
                      size="small"
                      rowSelection={rowSelection}
                      columns={columns}
                      dataSource={MOCK_REMISES_FAMILLE}
                      pagination={false}
                      scroll={{ y: 140 }} // Adjust height to match UI
                      bordered={false}
                    />
                  </div>

                  {/* Buttons Sidebar */}
                  <div className="flex flex-col gap-1 w-[90px] shrink-0 pt-1">
                    <Button
                      size="small"
                      className="border-[#0078d7] text-[#0069bb] hover:bg-[#e8f3ff] w-full"
                    >
                      Ajouter
                    </Button>
                    <Button size="small" disabled={selectedRowKeys.length === 0} className="w-full">
                      Supprimer
                    </Button>
                  </div>
                </div>
              )
            },
            {
              key: 'exception',
              label: "Tarifs d'exception",
              children: (
                <div className="pt-4">
                  <Empty text="Aucun tarif d'exception" />
                </div>
              )
            }
          ]}
        />
      </div>
    </Panel>
  )
}
