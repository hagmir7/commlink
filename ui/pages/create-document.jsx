import { useEffect, useRef, useState } from 'react'
import { Button, message, Select } from 'antd'
import { CaretDownOutlined, CaretUpOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import DocumentHeaderForm from '../components/DocumentHeaderForm'
import DocumentLines from '../components/DocumentLines'
import DocumentTotals from '../components/DocumentTotals'
import { api } from '../utils/api'
import DocumentBarTitle from '../components/DocumentBarTitle'
import DocumentToolbar from '../components/DocumentToolbar'

export default function CreateDocument() {
  const { piece } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const documentType = searchParams.get('documentType')

  const [document, setDocument] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [hasSelection, setHasSelection] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [loadingMovement, setLoadingMovement] = useState(false)

  const linesRef = useRef(null)

  /**
   * Fetch document
   */
  const fetchDocument = async (currentPiece) => {
    if (!currentPiece || !documentType) {
      return
    }

    setLoadingDocument(true)

    try {
      const response = await api.get(`documents/${documentType}/${currentPiece}`)

      const data = response.data

      setDocument(data)
      setLineItems(data?.lignes ?? [])
    } catch (error) {
      const errorData = error.response?.data

      message.error(
        errorData?.title || errorData?.detail || 'Erreur lors de la récupération du document'
      )

      setDocument(null)
      setLineItems([])
    } finally {
      setLoadingDocument(false)
    }
  }

  /**
   * Load document when piece or documentType changes
   */
  useEffect(() => {
    if (piece && documentType) {
      fetchDocument(piece)
    } else {
      setDocument(null)
      setLineItems([])
    }
  }, [piece, documentType])

  /**
   * Update existing document
   */
  const update = async (data) => {
    if (!piece || !documentType) {
      return
    }

    try {
      const response = await api.patch(`documents/${documentType}/${piece}`, data)

      message.success('Modification réussie')

      return response.data
    } catch (error) {
      const errorData = error.response?.data

      message.error(
        errorData?.detail || errorData?.title || 'Erreur lors de la modification du document'
      )

      throw error
    }
  }

  /**
   * Create new document
   */
  const create = async (data) => {
    if (!documentType) {
      message.error('Type de document manquant')
      return
    }

    try {
      const response = await api.post('documents', data)

      const createdPiece = response.data?.piece

      if (!createdPiece) {
        throw new Error('Le numéro de pièce est absent de la réponse')
      }

      navigate(`/documents/${createdPiece}?documentType=${documentType}`)

      return response.data
    } catch (error) {
      const errorData = error.response?.data

      message.error(
        errorData?.title || errorData?.detail || 'Erreur lors de la création du document'
      )
      throw error
    }
  }

  /**
   * Handle header validation
   */
  const handleValidate = async (data) => {
    if (piece) {
      return update(data)
    }

    return create(data)
  }

  /**
   * Handle line selection
   */
  const handleSelectionChange = (keys) => {
    setHasSelection(keys.length > 0)
  }

  /**
   * Handle movement loading
   */
  const handleLoadingMovement = (loading) => {
    setLoadingMovement(loading)
  }

  /**
   * Refresh document after line update
   */
  const handleLinesUpdate = () => {
    if (piece) {
      fetchDocument(piece)
    }
  }

  /**
   * Handle an entry picked from the "Actions" dropdown.
   * Values are encoded as `"<action>:<arg>"` so a single Select can drive
   * several commands without extra state.
   */
  const handleAction = async (value) => {
    const [action, arg] = value.split(':')

    switch (action) {
      case 'transform':
        // Exposed by DocumentLines via useImperativeHandle
        await linesRef.current?.transform(arg)
        break

      default:
        break
    }
  }

  return (
    <div
      className="bg-[#f0f0f0] shadow-lg w-full h-screen max-h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: 'Segoe UI, Tahoma, sans-serif'
      }}
    >
      {/* Title bar */}
      <DocumentBarTitle piece={piece} document={document} />

      <DocumentToolbar documentType={documentType} document={document} />

      {/* Document header */}
      <DocumentHeaderForm
        piece={piece}
        document={document}
        documentType={documentType}
        loading={loadingDocument}
        onValidate={handleValidate}
      />

      {/* Document lines */}
      <DocumentLines
        ref={linesRef}
        lineItems={lineItems}
        piece={piece}
        documentType={documentType}
        onSelectionChange={handleSelectionChange}
        onLoadingMovemen={handleLoadingMovement}
        onUpdate={handleLinesUpdate}
      />

      {/* Bottom action bar */}
      {/* Bottom action bar */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-[#f0f0f0] border-t border-b border-gray-300">
        <Select
          size="small"
          value={null}
          placeholder="Actions"
          className="w-52"
          disabled={!hasSelection || loadingMovement}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          onChange={handleAction}
          options={[
            {
              label: 'Transformer',
              options: [
                { value: 'transform:Commande', label: 'Transformer en Commande' },
                { value: 'transform:Livraison', label: 'Transformer en Livraison' },
                { value: 'transform:Facture', label: 'Transformer en Facture' }
              ]
            }
          ]}
        />

        <Button
          size="small"
          icon={<CaretUpOutlined />}
          disabled={!hasSelection || loadingMovement}
          title="Monter les lignes sélectionnées"
          onClick={() => linesRef.current?.moveUp()}
        />

        <Button
          size="small"
          icon={<CaretDownOutlined />}
          disabled={!hasSelection || loadingMovement}
          title="Descendre les lignes sélectionnées"
          onClick={() => linesRef.current?.moveDown()}
        />
      </div>

      {/* Totals */}
      <div className="p-2">
        <DocumentTotals document={document} />
      </div>

      {/* Footer buttons */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-2 bg-[#f0f0f0]">
        <Button size="small">Nouveau</Button>

        <Button size="small" type="primary" disabled={loadingDocument}>
          OK
        </Button>

        <Button size="small">Annuler</Button>
      </div>
    </div>
  )
}
