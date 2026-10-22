import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, message, Select, Typography } from 'antd'
import { CaretDownOutlined, CaretUpOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import DocumentHeaderForm from '../components/DocumentHeaderForm'
import DocumentLines from '../components/DocumentLines'
import DocumentTotals from '../components/DocumentTotals'
import { api } from '../utils/api'
import DocumentBarTitle from '../components/DocumentBarTitle'
import DocumentToolbar from '../components/DocumentToolbar'
import DocumentIntegrationModal from '../components/DocumentIntegrationModal'
import StockUnavailabilityModal from '../components/ui/StockUnavailabilityModal'
import { dateFormat } from '../utils/date'
import DocumentArticleStock from '../components/DocumentArticleStock'

const { Text } = Typography

// Must match the status value used for "Envoyé" in your statuses list.
const ENVOYER_STATUT_VALUE = 1

const getArticleRef = (line) =>
  line?.articleRef ?? line?.refArticle ?? line?.reference ?? line?.ref ?? null

// Safe focus: never throws if the input is not in the DOM
const focusReference = () => window.document.getElementById('referenc')?.focus()

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  return data?.title || data?.detail || data?.message || error?.message || fallback
}

export default function CreateDocument() {
  const { piece } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const documentType = searchParams.get('documentType')

  const [document, setDocument] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [loadingMovement, setLoadingMovement] = useState(false)
  const [integrationOpen, setIntegrationOpen] = useState(false)

  // Stock unavailability queue: one modal step per item in the list
  const [unavailabilityOpen, setUnavailabilityOpen] = useState(false)
  const [unavailabilityData, setUnavailabilityData] = useState([])
  const [unavailabilityIndex, setUnavailabilityIndex] = useState(0)

  // Values validated by the user for each item (index-aligned with the data)
  const unavailabilityResultsRef = useRef([])

  const linesRef = useRef(null)
  const headerRef = useRef(null)

  // Derived selection state
  const hasSelection = selectedRows.length > 0
  const selectedLine = selectedRows.length === 1 ? selectedRows[0] : null
  const selectedArticleRef = getArticleRef(selectedLine)

  /**
   * Fetch document.
   * `silent` = background refresh: no loading flag, and the existing
   * document is kept on screen if the request fails.
   */
  const fetchDocument = async (currentPiece, { silent = false } = {}) => {
    if (!currentPiece || !documentType) {
      return
    }

    if (!silent) setLoadingDocument(true)

    try {
      const response = await api.get(`documents/${currentPiece}`)
      const data = response.data

      setDocument(data)
      setLineItems(data?.lignes ?? [])
    } catch (error) {
      message.error(getErrorMessage(error, 'Erreur lors de la récupération du document'))

      if (!silent) {
        setDocument(null)
        setLineItems([])
      }
    } finally {
      if (!silent) setLoadingDocument(false)
    }
  }

  /**
   * Load document when piece or documentType changes
   */
  useEffect(() => {
    setSelectedRows([])

    if (piece && documentType) {
      fetchDocument(piece)
    } else {
      setDocument(null)
      setLineItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece, documentType])

  /**
   * Update existing document
   */
  const update = async (data) => {
    if (!piece || !documentType) {
      return
    }

    let response
    try {
      response = await api.patch(`documents/${documentType}/${piece}`, data)
    } catch (error) {
      console.error('Error updating document:', error)
      message.error(getErrorMessage(error, 'Erreur lors de la modification du document'))
      throw error
    }

    focusReference()
    return response.data
  }

  /**
   * Create new document
   */
  const create = async (data) => {
    if (!documentType) {
      message.error('Type de document manquant')
      return
    }

    let response
    try {
      response = await api.post('documents', data)

      const createdPiece = response.data?.piece

      if (!createdPiece) {
        throw new Error('Le numéro de pièce est absent de la réponse')
      }

      navigate(`/documents/${createdPiece}?documentType=${documentType}`)
    } catch (error) {
      message.error(getErrorMessage(error, 'Erreur lors de la création du document'))
      throw error
    }

    focusReference()
    return response.data
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
   * Change the status to "Envoyé" and save the WHOLE form.
   * Only used after sending the document (WhatsApp).
   */
  const handleUpdateStatusToEnvoyer = async () => {
    if (!piece) return

    try {
      const saved = await headerRef.current?.submitWithStatut(ENVOYER_STATUT_VALUE)
      if (saved) await fetchDocument(piece, { silent: true })
    } catch {
      // update() already showed the error toast
    }
  }

  /**
   * Handle line selection.
   * Stable callback — DocumentLines can safely put it in an effect dependency
   * list without triggering an update loop.
   */
  const handleSelectionChange = useCallback((_keys, rows) => {
    setSelectedRows(rows ?? [])
  }, [])

  /**
   * Handle movement loading
   */
  const handleLoadingMovement = (loading) => {
    setLoadingMovement(loading)
  }

  /**
   * Refresh document after a line update.
   * Returns the promise so callers can `await onUpdate()`.
   */
  const handleLinesUpdate = () => {
    if (!piece) return Promise.resolve()
    return fetchDocument(piece, { silent: true })
  }

  /**
   * Handle an entry picked from the "Actions" dropdown.
   */
  const handleAction = async (value) => {
    switch (value) {
      case 'transform':
        await linesRef.current?.transform()
        break
      case 'integrate':
        setIntegrationOpen(true)
        break

      default:
        break
    }
  }

  /**
   * Called when the integration finishes.
   */
  const integrationComplete = (data) => {
    fetchDocument(piece, { silent: true })

    if (Array.isArray(data) && data.length > 0) {
      unavailabilityResultsRef.current = []
      setUnavailabilityData(data)
      setUnavailabilityIndex(0)
      setUnavailabilityOpen(true)
    }
  }

  /**
   * Close the whole unavailability queue and reset its state
   */
  const resetUnavailability = () => {
    setUnavailabilityOpen(false)
    setUnavailabilityData([])
    setUnavailabilityIndex(0)
  }

  /**
   * User clicked OK: store the values, then show the next item,
   * or close after the last one.
   */
  const handleUnavailabilityOk = (values) => {
    unavailabilityResultsRef.current[unavailabilityIndex] = values

    const nextIndex = unavailabilityIndex + 1

    if (nextIndex < unavailabilityData.length) {
      setUnavailabilityIndex(nextIndex)
      return
    }

    resetUnavailability()
    fetchDocument(piece, { silent: true })
  }

  return (
    <div
      className="bg-[#f0f0f0] shadow-lg w-full h-screen max-h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: 'Segoe UI, Tahoma, sans-serif'
      }}
    >
      {/* Title bar */}
      <DocumentBarTitle piece={piece} document={document} documentType={documentType} />
      <DocumentToolbar
        documentType={documentType}
        document={document}
        updateDocumentStatus={handleUpdateStatusToEnvoyer}
        onRefresh={handleLinesUpdate}
      />
      {/* Document header */}
      <DocumentHeaderForm
        ref={headerRef}
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
        onLoadingMovement={handleLoadingMovement}
        onUpdate={handleLinesUpdate}
      />

      {/* Bottom action bar */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-[#f0f0f0] border-t border-b border-gray-300">
        <Select
          size="small"
          value={null}
          placeholder="Actions"
          className="w-52"
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          onChange={handleAction}
          options={[
            {
              label: 'Transformer',
              options: [{ value: 'transform', label: 'Transformer le(s) document(s)' }]
            },
            {
              label: 'Intégrer',
              options: [{ value: 'integrate', label: 'Integrer des documents...' }]
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

      {/* Article stock (one selected line) or totals (otherwise) */}
      <div className="p-2">
        {selectedArticleRef ? (
          <DocumentArticleStock key={selectedArticleRef} refArticle={selectedArticleRef} />
        ) : (
          <DocumentTotals document={document} />
        )}
      </div>

      {/* Footer buttons */}
      <div className="shrink-0 flex items-center justify-between bg-[#f0f0f0] px-3 py-2">
        <div>
          <Text>
            Créé le {document?.date ? dateFormat(document?.date) : ''} par {document?.creatore}
          </Text>
        </div>
        <div className="flex gap-2 ">
          <Button
            size="small"
            type="primary"
            onClick={() => window.api?.closeWindow()}
            disabled={loadingDocument}
          >
            OK
          </Button>

          <Button onClick={() => window.api?.closeWindow()} size="small">
            Annuler
          </Button>
        </div>
      </div>
      <DocumentIntegrationModal
        open={integrationOpen}
        onClose={() => setIntegrationOpen(false)}
        targetType={documentType}
        targetPiece={piece}
        onIntegrated={integrationComplete}
        document={document}
      />
      {/* key remounts the modal for each item so its local state resets */}
      <StockUnavailabilityModal
        key={unavailabilityIndex}
        open={unavailabilityOpen}
        onOk={handleUnavailabilityOk}
        onClose={resetUnavailability}
        unvilableData={unavailabilityData[unavailabilityIndex] ?? null}
        current={unavailabilityIndex + 1}
        total={unavailabilityData.length}
      />
    </div>
  )
}
