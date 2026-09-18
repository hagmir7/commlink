import { useState, useEffect, useRef } from 'react'
import { Select, Button, message } from 'antd'
import {
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
  DownOutlined,
  CaretDownOutlined,
  CaretUpOutlined
} from '@ant-design/icons'
import DocumentHeaderForm from '../components/DocumentHeaderForm'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DocumentTotals from '../components/DocumentTotals'
import { api } from '../utils/api'
import DocumentLines from '../components/DocumentLines'

export default function CreateDocument() {
  const { piece } = useParams()
  const [document, setDocument] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [hasSelection, setHasSelection] = useState(false)
  const linesRef = useRef(null)

  const navigation = useNavigate()
  const [searchParams] = useSearchParams()
  const documentType = searchParams.get('documentType')

  const fetchDocument = async (piece) => {
    try {
      const response = await api.get(`documents/${documentType}/${piece}`)
      setDocument(response?.data)
      setLineItems(response?.data?.lignes)
    } catch (e) {
      message.error(e.response?.data?.title || 'Erreur lors de la récupération du document')
      console.error('Error fetching document:', e.response?.data || e.message)
    }
  }

  useEffect(() => {
    if (piece) {
      fetchDocument(piece)
    }
  }, [piece])

  const update = async (data) => {
    try {
      const response = await api.patch(`documents/${documentType}/${piece}`, data)
      message.success('Start Updating successfully')
      return response.data
    } catch (e) {
      message.error(e.response?.data?.title)
      console.error('Error updating document:', e.response?.data || e.message)
      throw e
    }
  }

  const create = async (data) => {
    try {
      const response = await api.post('documents', data)
      navigation(`/documents/${response.data.piece}?documentType=${documentType}`)
      return response.data
    } catch (e) {
      message.error(e.response?.data?.title)
      console.error('Error creating document:', e.response?.data || e.message)
      throw e
    }
  }

  return (
    <div
      className="bg-[#f0f0f0] border border-gray-400 shadow-lg w-full h-screen max-h-screen flex flex-col overflow-hidden"
      style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}
    >
      {/* Title bar */}
      <div className="shrink-0 flex items-center justify-between bg-gradient-to-b from-white to-gray-100 border-b border-gray-300 px-2 py-1">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold">
            C
          </span>
          {piece ? (
            <span className="text-md text-gray-800 font-semibold">
              Bone de commande : {document?.statut} N° {piece} {document?.clientCode}{' '}
              {document?.clientIntitule}
            </span>
          ) : (
            <span className="text-[13px] text-gray-800">Nouveau Devis</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-200">
            <MinusOutlined style={{ fontSize: 10 }} />
          </button>
          <button className="w-6 h-6 flex items-center justify-center hover:bg-gray-200">
            <BorderOutlined style={{ fontSize: 9 }} />
          </button>
          <button className="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white">
            <CloseOutlined style={{ fontSize: 10 }} />
          </button>
        </div>
      </div>

      <DocumentHeaderForm
        piece={piece}
        document={document}
        documentType={documentType}
        onValidate={(data) => (piece ? update(data) : create(data))}
      />

      <DocumentLines
        ref={linesRef}
        lineItems={lineItems}
        piece={piece}
        documentType={documentType}
        onSelectionChange={(keys) => setHasSelection(keys.length > 0)}
      />

      {/* Bottom action bar */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-[#f0f0f0] border-t border-b border-gray-300">
        <Select
          size="small"
          defaultValue="Actions"
          className="w-24"
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          options={[{ value: 'Actions', label: 'Actions' }]}
        />
        <Button
          size="small"
          icon={<CaretUpOutlined />}
          disabled={!hasSelection}
          title="Monter les lignes sélectionnées"
          onClick={() => linesRef.current?.moveUp()}
        />
        <Button
          size="small"
          icon={<CaretDownOutlined />}
          disabled={!hasSelection}
          title="Descendre les lignes sélectionnées"
          onClick={() => linesRef.current?.moveDown()}
        />
      </div>

      <DocumentTotals />

      {/* Footer buttons */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-2 bg-[#f0f0f0]">
        <Button size="small">Nouveau</Button>
        <Button size="small" type="primary">
          OK
        </Button>
        <Button size="small">Annuler</Button>
      </div>
    </div>
  )
}
