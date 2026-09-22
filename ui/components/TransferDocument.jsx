import { Radio, Select, Input, DatePicker, Checkbox, Button, message } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useNavigate } from 'react-router-dom'

dayjs.extend(customParseFormat)
const TODAY = dayjs().startOf('day')

// ---------------------------------------------------------------------------
// Ordered workflow chain (vente).
// `target` matches the C# enum Demo.Models.TransformTarget:
//   Commande | PrepaLivraison | Livraison | Facture
// Source-only types have `target: null`.
// ---------------------------------------------------------------------------
const DOCUMENT_CHAIN = [
  { label: 'Devis', value: 'DocumentTypeVenteDevis', target: null, hidden: true },
  { label: 'Bon de commande', value: 'DocumentTypeVenteCommande', target: 'Commande' },
  // {
  //   label: 'Préparation de livraison',
  //   value: 'DocumentTypeVentePrepaLivraison',
  //   target: 'PrepaLivraison'
  // },
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

export default function TransferDocument({ currentDocumentType, document, setOpen }) {
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
  const [souche, setSouche] = useState(document?.souche ?? 'souche_a')
  const [nextPiece, setNextPiece] = useState('')
  const [statutOptions, setStatutOptions] = useState([])
  const [date, setDate] = useState(TODAY)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const [options, setOptions] = useState({
    conserverDevis: false,
    majTaxes: false,
    recalculerPrix: false,
    recalculerFrais: false,
    appliquerBaremes: false
  })

  // Re-sync when the source document changes
  useEffect(() => {
    setDocumentType(defaultType)
  }, [defaultType])

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
          `documents/${documentType}/next-piece?souche=${document?.souche ?? ''}`
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
  }, [documentType, document?.souche])

  // Currently selected entry (has `target`)
  const selectedEntry = useMemo(
    () => DOCUMENT_CHAIN.find((d) => d.value === documentType),
    [documentType]
  )

  const canTransform = allowedTypes.length > 0 && Boolean(selectedEntry?.target) && !submitting

  // ---------------------------------------------------------------------
  // Submit transformation — target goes in the URL query string
  // ---------------------------------------------------------------------
  const transfer = async () => {
    if (!selectedEntry?.target) {
      message.error('Type de document cible invalide.')
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

      const response = await api.post(
        `documents/${currentDocumentType}/${document?.piece}/transform?target=${selectedEntry.target}`,
        payload
      )

      const newPiece = response?.data?.resultat
      if (!newPiece) {
        message.error('Aucun document généré.')
        return
      }

      message.success(`Document ${newPiece} créé.`)
      navigate(`/documents/${newPiece}?documentType=${documentType}`)
      setOpen(false)
    } catch (error) {
      console.error(error?.response?.data || error)
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          'Erreur lors de la transformation.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
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
                { value: 'souche_b', label: 'Souche B' },
                { value: 'souche_c', label: 'Souche C' }
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
