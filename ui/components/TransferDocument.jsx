import { Radio, Select, Input, DatePicker, Checkbox, Button, message } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useNavigate } from 'react-router-dom'

import StockUnavailabilityModal from './ui/StockUnavailabilityModal'
import useUnavailabilityQueue from '../hooks/useUnavailabilityQueue'
import { DEFAULT_STATUT, SOUCHE_OPTIONS } from '../constants/documentTypes'

dayjs.extend(customParseFormat)
const TODAY = dayjs().startOf('day')

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
  sourceDoc,
  setOpen,
  lignes = [],
  onTransferred,
  navigateOnSuccess = true
}) {
  const navigate = useNavigate()

  const currentIndex = useMemo(
    () => DOCUMENT_CHAIN.findIndex((d) => d.value === currentDocumentType),
    [currentDocumentType]
  )

  const allowedEntries = useMemo(
    () => (currentIndex >= 0 ? DOCUMENT_CHAIN.slice(currentIndex + 1) : []),
    [currentIndex]
  )
  const allowedTypes = useMemo(() => allowedEntries.map((d) => d.value), [allowedEntries])

  const defaultType = allowedTypes[0] ?? null

  const [documentType, setDocumentType] = useState(defaultType)
  const [statut, setStatut] = useState(DEFAULT_STATUT.label)
  const [souche, setSouche] = useState(sourceDoc?.souche)
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
    // After the stock modal finishes, the source is only partially transformed.
    // Do NOT remove the source locally in that case.
    onTransferred?.()
    setOpen(false)
  })

  useEffect(() => {
    setDocumentType(defaultType)
  }, [defaultType])

  useEffect(() => {
    if (sourceDoc?.souche) setSouche(sourceDoc.souche)
  }, [sourceDoc?.souche])

  const toggleOption = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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

  useEffect(() => {
    if (!documentType) {
      setNextPiece('')
      return
    }

    let cancelled = false
    const getNextPiece = async () => {
      try {
        const response = await api.get(
          `documents/${documentType}/next-piece?souche=${souche ?? ''}`
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
  }, [documentType, souche])

  const selectedEntry = useMemo(
    () => DOCUMENT_CHAIN.find((d) => d.value === documentType),
    [documentType]
  )

  const canTransform = allowedTypes.length > 0 && Boolean(selectedEntry?.target) && !submitting

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
      // Lines selected: transfer only those lines, source STAYS.
      // ------------------------------------------------------------------
      if (lignes.length > 0) {
        const positions = lignes.map((l) => (typeof l === 'object' ? (l.position ?? l.id) : l))

        const response = await api.post(
          `documents/${currentDocumentType}/${sourceDoc.piece}/transform/lines`,
          { positions, target: selectedEntry.target, ...payload }
        )

        const missing = response?.data?.nonTransferred ?? []
        if (missing.length > 0) {
          message.warning(`${missing.length} ligne(s) non transférée(s).`)
          queue.start(missing)
          onTransferred?.() // source still exists — don't remove locally
          return
        }

        message.success(
          lignes.length > 1 ? `${lignes.length} lignes transformées` : 'Ligne transformée'
        )
        onTransferred?.() // source still exists — don't remove locally
        setOpen(false)
        return
      }

      // ------------------------------------------------------------------
      // No lines selected: transfer the WHOLE document → source is consumed.
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
        onTransferred?.() // source still has un-transferred lines — keep it
        return
      }

      if (!newPiece) {
        message.error('Aucun document généré.')
        return
      }

      message.success(`Document ${newPiece} créé.`)
      onTransferred?.(sourceDoc.piece)

      if (navigateOnSuccess) {
        navigate(`/documents/${newPiece}?documentType=${documentType}`)
      }

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

      queue.start(data?.nonTransferred)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="text-[13px] text-gray-800 py-2 px-2">
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
              options={SOUCHE_OPTIONS}
            />
          </FieldRow>

          <FieldRow label="N° de pièce">
            <Input
              value={nextPiece}
              onChange={(e) => setNextPiece(e.target.value)}
              size="small"
              readOnly
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

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2">
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
