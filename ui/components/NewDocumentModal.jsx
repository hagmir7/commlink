import { useState } from 'react'
import { Radio, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { DOCUMENT_TYPES } from '../constants/documentTypes'
import { handleShow } from '../utils/helpers'
import DesktopWindow from './ui/DesktopWindow'

export const DEFAULT_DOCUMENT_TYPE = DOCUMENT_TYPES.find((t) => t.value === 0)

export default function SelectDocumentTypeModal({ open, onCancel }) {
  const navigate = useNavigate()
  const [documentType, setDocumentType] = useState(DEFAULT_DOCUMENT_TYPE?.value)
  const [loading, setLoading] = useState(false)

  const handleOk = () => {
    const selected = DOCUMENT_TYPES.find((t) => t.value === documentType)
    if (!selected) return

    setLoading(true)
    handleShow(navigate, `/create-document?documentType=${selected.type}`)

    onCancel()
    setLoading(false)
  }

  const handleClose = () => {
    setDocumentType(DEFAULT_DOCUMENT_TYPE?.value)
    onCancel()
  }

  return (
    <DesktopWindow open={open} onClose={handleClose} title="Nouveau document" width={300}>
      <p className="mb-2 text-xs font-normal text-gray-400">
        Choisissez le type de document à créer
      </p>

      <Radio.Group
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {DOCUMENT_TYPES.map((type) => (
          <Radio key={type.value} value={type.value} className="text-[14px]">
            {type.label}
          </Radio>
        ))}
      </Radio.Group>

      <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
        <Button size="small" onClick={handleClose}>
          Annuler
        </Button>
        <Button
          type="primary"
          size="small"
          loading={loading}
          disabled={documentType === undefined}
          onClick={handleOk}
        >
          OK
        </Button>
      </div>
    </DesktopWindow>
  )
}
