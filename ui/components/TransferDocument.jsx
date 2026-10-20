import { Radio, Select, Input, DatePicker, Checkbox, Button, message } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'

import { api } from '../utils/api'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useNavigate } from 'react-router-dom'

import StockUnavailabilityModal from './ui/StockUnavailabilityModal'
import useUnavailabilityQueue from '../hooks/useUnavailabilityQueue'

dayjs.extend(customParseFormat)
const TODAY = dayjs().startOf('day')

// ---------------------------------------------------------------------------
const DOCUMENT_CHAIN = [
  { label: 'Devis', value: 'DocumentTypeVenteDevis', target: null, hidden: true },
  { label: 'Bon de commande', value: 'DocumentTypeVenteCommande', target: 'Commande' },
  { label: 'Bon de livraison', value: 'DocumentTypeVenteLivraison', target: 'Livraison' },
  { label: 'Facture', value: 'DocumentTypeVenteFacture', target: 'Facture' }
]

const transformOptions = [
  { key: 'conserverDevis', label: "Conserver le devis d'origine" },
  { key: 'majTaxes', label: 'Mettre à jour les taux de taxes' },
  { key: 'recalculerPrix', label: 'Recalculer le prix de vente' },
  { key: 'recalculerFrais', label: "Recalculer les frais d'expédition" },
  { key: 'appliquerBaremes', label: 'Appliquer les barèmes' }
]

export default function TransferDocument({
  currentDocumentType,
  sourceDoc, // renamed from `document` (it collided with the global window.document)
  setOpen,
  lignes = [],
  onTransferred
}) {
  const navigate = useNavigate()

  // Position of the current document in the chain (-1 if unknown)
  const currentIndex = useMemo(
    () => DOCUMENT_CHAIN.findIndex((d) => d.value === currentDocumentType),
    [currentDocumentType]
  )

  // Only targets strictly after the current one are allowed
  const allowedEntries = useMemo(
    () => (currentIndex >= 0 ? DOCUMENT_CHAIN.slice(currentIndex + 1) : []),
    [currentIndex]
  )
  const allowedTypes = useMemo(() => allowedEntries.map((d) => d.value), [allowedEntries])

  // Default = first allowed type
  const defaultType = allowedTypes[0] ?? null

  const [documentType, setDocumentType] = useState(defaultType)
  const [statut, setStatut] = useState('saisi')
  const [souche, setSouche] = useState(sourceDoc?.souche ?? 'souche_a')
  const [nextPiece, setNextPiece] = useState('')
  const [statutOptions, setStatutOptions] = useState([])
  const [date, setDate] = useState(TODAY)
  const [submitting, setSubmitting] = useState(false)

  const [options, setOptions] = useState({
    conserverDevis: false,
    majTaxes: false,
    recalculerPrix: false,
    recalculerFrais: false,
    appliquerBaremes: false
  })

  const queue = useUnavailabilityQueue(() => {
    onTransferred?.()
    setOpen(false)
  })

  // Re-sync when the source document changes
  useEffect(() => {
    setDocumentType(defaultType)
  }, [defaultType])

  // Re-sync souche when the source document changes
  useEffect(() => {
    if (sourceDoc?.souche) setSouche(sourceDoc.souche)
  }, [sourceDoc?.souche])

  const toggleOption = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Load statuts for the target type
  useEffect(() => {
    if (!documentType) return

    let cancelled = false
    const getStatuts = async () => {
      try {
        const response = await api.get(`documents/${documentType}/statuts`)
        if (!cancelled) setStatutOptions(response.data)
      } catch (error) {
        console.error(error)
      }
    }
    getStatuts()
    return () => {
      cancelled = true
    }
  }, [documentType])

  // Load next piece number
  useEffect(() => {
    if (!documentType) {
      setNextPiece('')
      return
    }

    let cancelled = false
    const getNextPiece = async () => {
      try {
        const response = await api.get(
          `documents/${documentType}/next-piece?souche=${sourceDoc?.souche ?? ''}`
        )
        if (!cancelled) setNextPiece(response?.data?.piece ?? '')
      } catch (error) {
        console.error(error)
        if (!cancelled) setNextPiece('')
      }
    }
    getNextPiece()
    return () => {
      cancelled = true
    }
  }, [documentType, sourceDoc?.souche])

  // Currently selected entry (has `target`)
  const selectedEntry = useMemo(
    () => DOCUMENT_CHAIN.find((d) => d.value === documentType),
    [documentType]
  )

  const canTransform = allowedTypes.length > 0 && Boolean(selectedEntry?.target) && !submitting

  // ---------------------------------------------------------------------
  // Submit transformation
  //  - lignes selected  -> transfer ONLY those lines, no navigation
  //  - no lignes        -> transfer the whole document, then navigate
  // ---------------------------------------------------------------------
  const transfer = async () => {
    if (!selectedEntry?.target) {
      message.error('Type de document cible invalide.')
      return
    }

    if (!sourceDoc?.piece) {
      message.error('Document source introuvable.')
      return
    }

    const payload = {
      statut,
      souche,
      piece: nextPiece,
      date: date.format('YYYY-MM-DD'),
      options
    }

    try {
      setSubmitting(true)

      // ------------------------------------------------------------------
      // Lines selected: transfer only those lines, stay on the current page
      // ------------------------------------------------------------------
      if (lignes.length > 0) {
        // `lignes` is an array of 1-based positions (numbers) from DocumentLines
        const positions = lignes.map((l) => (typeof l === 'object' ? (l.position ?? l.id) : l))

        const response = await api.post(
          `documents/${currentDocumentType}/${sourceDoc.piece}/transform/lines`,
          { positions, target: selectedEntry.target, ...payload }
        )

        const missing = response?.data?.nonTransferred ?? []
        if (missing.length > 0) {
          message.warning(`${missing.length} ligne(s) non transférée(s).`)
          queue.start(missing)
          onTransferred?.()
          return
        }

        message.success(
          lignes.length > 1 ? `${lignes.length} lignes transformées` : 'Ligne transformée'
        )
        onTransferred?.()
        setOpen(false)
        return
      }

      // ------------------------------------------------------------------
      // No lines selected: transfer the whole document and navigate
      // ------------------------------------------------------------------
      const response = await api.post(
        `documents/${currentDocumentType}/${sourceDoc.piece}/transform?target=${selectedEntry.target}`,
        payload
      )

      const newPiece = response?.data?.resultat ?? response?.data?.piece
      const missing = response?.data?.nonTransferred ?? []
      if (missing.length > 0) {
        message.warning(
          newPiece
            ? `Document ${newPiece} créé, mais ${missing.length} ligne(s) non transférée(s).`
            : `${missing.length} ligne(s) non transférée(s).`
        )
        queue.start(missing)
        onTransferred?.()
        return
      }

      if (!newPiece) {
        message.error('Aucun document généré.')
        return
      }

      message.success(`Document ${newPiece} créé.`)
      navigate(`/documents/${newPiece}?documentType=${documentType}`)
      setOpen(false)
    } catch (error) {
      const data = error?.response?.data
      console.error(data || error)
      message.error(
        data?.message ||
          data?.detail ||
          data?.title ||
          (lignes.length > 0
            ? 'Erreur lors de la transformation des lignes'
            : 'Erreur lors de la transformation.')
      )

      // Nothing was created: show every line, stay on this dialog
      queue.start(data?.nonTransferred)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="py-2 px-2">
      <div className="text-[13px] text-gray-800">
        <p className="mb-2 text-gray-700">Indiquer vers quel type transformer ce(s) document(s):</p>
        <Radio.Group
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {DOCUMENT_CHAIN.map((type) => {
            const disabled = !allowedTypes.includes(type.value)
            return (
              <Radio
                key={type.value}
                value={type.value}
                disabled={disabled}
                className="text-[13px]"
              >
                {type.label}
              </Radio>
            )
          })}
        </Radio.Group>

        <br />
        <SectionDivider label="Paramètres du nouveau document" />

        <div className="flex flex-col gap-2.5">
          <FieldRow label="Statut">
            <Select
              value={statut}
              onChange={setStatut}
              size="small"
              className="w-full"
              disabled={!canTransform}
              suffixIcon={<DownOutlined className="text-[10px] text-gray-500" />}
              options={statutOptions}
            />
          </FieldRow>

          <FieldRow label="Souche">
            <Select
              value={souche}
              onChange={setSouche}
              size="small"
              className="w-full"
              disabled
              suffixIcon={<DownOutlined className="text-[10px] text-gray-500" />}
              options={[
                { value: 'souche_a', label: 'Souche A' },
                { value: 'souche_b', label: 'Souche B' }
              ]}
            />
          </FieldRow>

          <FieldRow label="N° de pièce">
            <Input
              value={nextPiece}
              onChange={(e) => setNextPiece(e.target.value)}
              size="small"
              disabled={!canTransform}
              className="border-blue-400 bg-blue-50 font-medium text-blue-700 shadow-[0_0_0_1px_rgba(96,165,250,0.5)]"
            />
          </FieldRow>

          <FieldRow label="Date">
            <DatePicker
              size="small"
              value={date}
              onChange={(v) => setDate(v)}
              format="DDMMYY"
              disabled={!canTransform}
              className="w-full"
              allowClear={false}
            />
          </FieldRow>
        </div>

        <SectionDivider label="Options de transformation" />

        <div className="flex flex-col gap-2.5">
          <div className="mt-1 flex flex-col gap-1.5 pl-[1px]">
            {transformOptions.map((opt) => (
              <Checkbox
                key={opt.key}
                checked={options[opt.key]}
                onChange={() => toggleOption(opt.key)}
                disabled={!canTransform}
                className="text-[13px]"
              >
                {opt.label}
              </Checkbox>
            ))}
          </div>
        </div>
      </div>
      <br />

      <div className="flex items-center justify-end gap-2 border-gray-200 pt-2">
        <Button
          type="primary"
          size="small"
          onClick={transfer}
          loading={submitting}
          className="min-w-[76px]"
          disabled={!canTransform}
        >
          OK
        </Button>
        <Button
          size="small"
          className="min-w-[76px]"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Annuler
        </Button>
      </div>

      {/* key remounts the modal for each item so its local state resets */}
      <StockUnavailabilityModal key={queue.index} {...queue.modalProps} />
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div className="my-3 flex items-center gap-2">
      <span className="whitespace-nowrap text-[13px] text-gray-700">{label}</span>
      <div className="h-px flex-1 bg-gray-300" />
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <span className="text-right text-[13px] text-gray-700">{label}</span>
      {children}
    </div>
  )
}
