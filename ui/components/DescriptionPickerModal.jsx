import { useEffect, useState } from 'react'
import { Modal, Table } from 'antd'
import { api } from '../utils/api'

/**
 * Picker modal opened via F4 on the Description field.
 * Fetches the list from the API, lets the user pick one row
 * (click to select, double-click or OK to confirm), and returns
 * the chosen record's eL_Intitule via onSelect.
 */
export default function DescriptionPickerModal({ open, onClose, onSelect }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [selectedRow, setSelectedRow] = useState(null)

  useEffect(() => {
    if (!open) return

    setSelectedRow(null)
    setLoading(true)

    api
      .get('/EnumLibreCial')
      .then((response) => setData(response.data))
      .catch((err) => {
        console.error('Failed to fetch descriptions', err)
        setData([])
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleConfirm = () => {
    if (selectedRow) {
      onSelect(selectedRow.eL_Intitule)
    }
    onClose()
  }

  const columns = [{ title: 'Intitule', dataIndex: 'eL_Intitule', key: 'eL_Intitule' }]

  return (
    <Modal
      title="Sélection information libre: Description"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okButtonProps={{ disabled: !selectedRow, size: 'small' }}
      cancelButtonProps={{ size: 'small' }}
      width={450}
      className="description-picker-modal"
    >
      <style>{`
        .description-picker-modal .ant-table-tbody > tr > td,
        .description-picker-modal .ant-table-thead > tr > th {
          padding: 2px 8px;
          font-size: 12px;
          line-height: 1.2;
        }
      `}</style>
      <Table
        size="small"
        rowKey="cbMarq"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ y: 320 }}
        rowClassName={(record) => (selectedRow?.cbMarq === record.cbMarq ? 'bg-blue-50' : '')}
        onRow={(record) => ({
          onClick: () => setSelectedRow(record),
          onDoubleClick: () => {
            onSelect(record.eL_Intitule)
            onClose()
          }
        })}
      />
    </Modal>
  )
}
