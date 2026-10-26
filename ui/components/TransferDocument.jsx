import { Radio, Select, Input, DatePicker, Checkbox, Button, message } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useNavigate } from 'react-router-dom'

import StockUnavailabilityModal from './ui/StockUnavailabilityModal'
import useUnavailabilityQueue from '../hooks/useUnavailabilityQueue'
import { DEFAULT_STATUT, SOUCHE_OPTIONS } from '../constants/documentTypes'
import {
  DOCUMENT_CHAIN,
  TRANSFORM_OPTIONS,
  DEFAULT_TRANSFORM_OPTIONS,
  getAllowedTargets
} from '../constants/transform'
import {
  getStatuts,
  getNextPiece,
  transformDocument,
  transformLines,
  parseTransferResult
} from '../api/transformApi'

dayjs.extend(customParseFormat)

// DEFAULT_STATUT peut exposer { label, value } ou seulement { label } selon votre fichier de constantes.
const DEFAULT_STATUT_VALUE = DEFAULT_STATUT?.value ?? DEFAULT_STATUT?.label

export default function TransferDocument({
  currentDocumentType,
  sourceDoc,
  setOpen,
  lignes = [],
  onTransferred,
  navigateOnSuccess = true
}) {
  const navigate = useNavigate()

  // Cibles possibles pour ce type de document (même règle que le backend).
  const allowedEntries = useMemo(
    () => getAllowedTargets(currentDocumentType),
    [currentDocumentType]
  )
  const allowedTypes = useMemo(() => allowedEntries.map((d) => d.value), [allowedEntries])
  const defaultType = allowedTypes[0] ?? null

  const [documentType, setDocumentType] = useState(defaultType)
  const [statut, setStatut] = useState(DEFAULT_STATUT_VALUE)
  const [souche, setSouche] = useState(sourceDoc?.souche)
  const [nextPiece, setNextPiece] = useState('')
  const [statutOptions, setStatutOptions] = useState([])
  const [date, setDate] = useState(() => dayjs().startOf('day'))
  const [submitting, setSubmitting] = useState(false)
  const [options, setOptions] = useState(DEFAULT_TRANSFORM_OPTIONS)

  const hasLines = lignes.length > 0

  // Fin de la file d'alertes de stock : la source n'est que partiellement transformée,
  // on la garde donc localement (onTransferred sans argument) et on ferme.
  const queue = useUnavailabilityQueue(() => {
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

  // Statuts du type cible. Si le statut choisi n'existe pas pour ce type, on revient au statut par défaut.
  useEffect(() => {
    if (!documentType) return

    let cancelled = false
    const loadStatuts = async () => {
      try {
        const list = await getStatuts(documentType)
        if (cancelled) return

        setStatutOptions(list)
        setStatut((current) => {
          if (list.some((o) => o.value === current)) return current
          const preferred = list.find((o) => o.value === DEFAULT_STATUT_VALUE)
          return (preferred ?? list[0])?.value ?? current
        })
      } catch (error) {
        console.error(error)
      }
    }
    loadStatuts()

    return () => {
      cancelled = true
    }
  }, [documentType])

  // Prochain numéro de pièce (affichage seulement : Sage attribue le numéro à la création).
  useEffect(() => {
    if (!documentType) {
      setNextPiece('')
      return
    }

    let cancelled = false
    const loadNextPiece = async () => {
      try {
        const piece = await getNextPiece(documentType, souche)
        if (!cancelled) setNextPiece(piece)
      } catch (error) {
        console.error(error)
        if (!cancelled) setNextPiece('')
      }
    }
    loadNextPiece()

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
      date: date.format('YYYY-MM-DD'),
      options
    }
    // console.log(selectedEntry.target)
    // return

    try {
      setSubmitting(true)

      // Lignes choisies : on ne transfère qu'elles, la source reste.
      // Sinon : document entier, la source est consommée (sauf reliquat).
      const { data } = hasLines
        ? await transformLines(currentDocumentType, sourceDoc.piece, {
            // Positions 1-based, comme le backend les compte.
            positions: lignes.map((l) => (typeof l === 'object' ? (l.position ?? l.id) : l)),
            target: selectedEntry.target,
            ...payload
          })
        : await transformDocument(
            currentDocumentType,
            sourceDoc.piece,
            selectedEntry.target,
            payload
          )

      const result = parseTransferResult(data)
      const missing = result.nonTransferred

      // Échec renvoyé avec un statut HTTP 200 (success = false).
      if (!result.success) {
        message.error(result.message || 'La transformation a échoué.')
        queue.start(missing)
        return
      }

      // Transformation partielle : la fin de la file ferme la fenêtre et rafraîchit.
      if (missing.length > 0) {
        message.warning(
          !hasLines && result.piece
            ? `Document ${result.piece} créé, mais ${missing.length} article(s) non transféré(s).`
            : `${missing.length} article(s) non transféré(s).`
        )
        queue.start(missing)
        return
      }

      if (hasLines) {
        message.success(
          lignes.length > 1 ? `${lignes.length} lignes transformées` : 'Ligne transformée'
        )
        onTransferred?.() // la source existe toujours : on ne la retire pas
        setOpen(false)
        return
      }

      if (!result.piece) {
        message.error('Aucun document généré.')
        return
      }

      message.success(`Document ${result.piece} créé.`)
      onTransferred?.(sourceDoc.piece) // source entièrement transformée : le parent peut la retirer

      if (navigateOnSuccess) {
        navigate(`/documents/${result.piece}?documentType=${documentType}`)
      }

      setOpen(false)
    } catch (error) {
      const data = error?.response?.data
      console.error(data || error)
      message.error(
        data?.message ||
          data?.detail ||
          data?.title ||
          (hasLines
            ? 'Erreur lors de la transformation des lignes.'
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
        <p className="mb-2 text-gray-700">
          Indiquer vers quel type transformer ce(s) document(s) :
        </p>
        <Radio.Group
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {DOCUMENT_CHAIN.map((type) => (
            <Radio
              key={type.value}
              value={type.value}
              disabled={!allowedTypes.includes(type.value)}
              className="text-[13px]"
            >
              {type.label}
            </Radio>
          ))}
        </Radio.Group>

        <p className="mt-2 text-[12px] text-gray-500">
          {allowedTypes.length === 0
            ? 'Ce type de document ne peut pas être transformé.'
            : hasLines
              ? `${lignes.length} ligne(s) sélectionnée(s) : seules ces lignes sont transférées, le document d’origine est conservé.`
              : 'Le document entier est transformé.'}
        </p>

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
              onChange={(v) => v && setDate(v)}
              format="DDMMYY"
              disabled={!canTransform}
              className="w-full"
              allowClear={false}
            />
          </FieldRow>
        </div>

        <SectionDivider label="Options de transformation" />

        <div className="mt-1 flex flex-col gap-1.5 pl-[1px]">
          {TRANSFORM_OPTIONS.map((opt) => (
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

      <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2">
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

      <StockUnavailabilityModal
        key={queue.index}
        {...queue.modalProps}
        documentPiece={sourceDoc?.piece}
        documentType={currentDocumentType}
      />
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
