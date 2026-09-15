import { Button, DatePicker, Input, Select } from 'antd'
import React, { useEffect, useState, useCallback } from 'react'
import { DownOutlined } from '@ant-design/icons'
import axios from 'axios'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const API_BASE = 'https://localhost:7244'
const TODAY = dayjs().startOf('day')

// --- Field labels used in error messages -------------------------------
const FIELD_LABELS = {
  reference: 'Référence',
  client: 'Client',
  date: 'Date',
  dateLivraison: 'Date livraison',
  statut: 'Statut',
  expedition: 'Expédition',
  type: 'Type',
  souche: 'Souche'
}

const REQUIRED_FIELDS = Object.keys(FIELD_LABELS)

// Safely coerce a value (string, Date, dayjs, null/undefined) into a dayjs
// instance or null. Prevents crashes when API data arrives as ISO strings
// instead of dayjs objects.
function toDayjsOrNull(value) {
  if (!value) return null
  const d = dayjs(value)
  return d.isValid() ? d : null
}

function LabeledField({ label, children, labelWidth = 96 }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[12px] text-gray-700 text-right shrink-0 whitespace-nowrap"
        style={{ width: labelWidth }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

export default function DocumentHeaderForm({ onValidate, piece, document, documentType }) {
  const [clientOptions, setClientOptions] = useState([])
  const [expeditionOptions, setExpeditionOptions] = useState([])
  const [statutOptions, setStatutOptions] = useState([])

  console.log(documentType)
  // --- per-field loading flags for the async selects ----------------------
  const [optionsLoading, setOptionsLoading] = useState({
    client: true,
    expedition: true,
    statut: true
  })
  const [optionsError, setOptionsError] = useState({})

  // --- controlled form state -----------------------------------------------
  // All fields that can come from an existing document are now seeded
  // consistently when `piece` (edit mode) is true.
  const [client, setClient] = useState(piece ? (document?.clientCode ?? null) : null)
  const [affaire, setAffaire] = useState(piece ? (document?.affaire ?? null) : null)
  const [expedition, setExpedition] = useState(
    piece ? document?.expedition || 'EX-WORK' : 'EX-WORK'
  )
  const [date, setDate] = useState(piece ? (toDayjsOrNull(document?.date) ?? TODAY) : TODAY)
  const [dateLivraisonStatut, setDateLivraisonStatut] = useState('Prévue')
  const [dateLivraison, setDateLivraison] = useState(
    piece ? toDayjsOrNull(document?.dateLivraison) : null
  )
  const [statut, setStatut] = useState(
    piece ? (document?.statut ?? 'DocumentStatutTypeSaisie') : 'DocumentStatutTypeSaisie'
  )

  const [representant, setRepresentant] = useState(piece ? (document?.representant ?? null) : null)
  const [nExpedition, setNExpedition] = useState(piece ? document?.nExpedition : undefined)
  const [nDocumentSouche, setNDocumentSouche] = useState(
    piece ? (document?.souche ?? 'Souche A') : 'Souche A'
  )
  const [nDocumentNumero, setNDocumentNumero] = useState(
    piece ? (document?.piece ?? '23DE000438') : '23DE000438'
  )
  const [reference, setReference] = useState(piece ? (document?.ref ?? '') : '')
  const [type, setType] = useState(piece ? (document?.type ?? null) : null)
  const [port, setPort] = useState(piece ? (document?.port ?? '') : '')

  // --- validation & submission state ---------------------------------------
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // --- generic option loader (replaces 3 near-identical functions) --------
  const loadOptions = useCallback(async (path, mapFn, setter, key) => {
    setOptionsLoading((prev) => ({ ...prev, [key]: true }))
    setOptionsError((prev) => ({ ...prev, [key]: undefined }))
    try {
      const { data } = await axios.get(`${API_BASE}${path}`)
      setter(data.map(mapFn))
    } catch (error) {
      console.error(`API Error (${path}):`, error)
      setOptionsError((prev) => ({
        ...prev,
        [key]: 'Impossible de charger les options'
      }))
    } finally {
      setOptionsLoading((prev) => ({ ...prev, [key]: false }))
    }
  }, [])

  useEffect(() => {
    loadOptions(
      '/clients?max=1000',
      (c) => ({
        value: c.code,
        label: `${c.code} ${c.intitule}`
      }),
      setClientOptions,
      'client'
    )

    loadOptions('/expeditions', (e) => ({ value: e, label: e }), setExpeditionOptions, 'expedition')

    loadOptions(
      `/documents/${documentType}/statuts`,
      (s) => ({ value: s.value, label: s.label }),
      setStatutOptions,
      'statut'
    )
  }, [loadOptions])

  // Re-sync form fields whenever `document` arrives or changes.
  // `useState`'s initial value only runs on first mount, so if `document`
  // is fetched asynchronously by the parent (the common case after a page
  // refresh), the fields above would otherwise stay empty forever even
  // once the data comes in.
  useEffect(() => {
    if (!piece || !document) return

    setClient(document.clientCode ?? null)
    setAffaire(document.affaire ?? null)
    setExpedition(document.expedition || 'EX-WORK')
    setDate(toDayjsOrNull(document.date) ?? TODAY)
    setDateLivraison(toDayjsOrNull(document.dateLivraison))
    setStatut(document.statut ?? 'DocumentStatutTypeSaisie')
    setRepresentant(document.representant ?? null)
    setNExpedition(document.nExpedition)
    setNDocumentSouche(document.souche ?? 'Souche A')
    setNDocumentNumero(document.nDocument?.numero ?? '23DE000438')
    setReference(document.ref ?? '')
    setType(document.type ?? null)
    setPort(document.port ?? '')
  }, [piece, document])

  // --- validation ------------------------------------------------------------
  const validate = () => {
    const values = {
      reference,
      client,
      date,
      dateLivraison,
      statut,
      expedition,
      type,
      souche: nDocumentSouche
    }
    const newErrors = {}

    REQUIRED_FIELDS.forEach((field) => {
      const value = values[field]
      const isEmpty = value === null || value === undefined || value === ''
      if (isEmpty) {
        newErrors[field] = `${FIELD_LABELS[field]} est obligatoire`
      }
    })

    if (dateLivraison && dateLivraison.startOf('day').isBefore(TODAY)) {
      newErrors.dateLivraison = "La date de livraison ne peut pas être antérieure à aujourd'hui"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  // Builds the payload and hands it off to the parent component.
  const handleValidate = async () => {
    if (submitting) return
    if (!validate()) return

    const formData = {
      clientCode: client,
      reference,
      type,
      affaire,
      expedition,
      date: date.format('DDMMYY'),
      dateLivraisonStatut,
      dateLivraison: dateLivraison.format('YYYY-MM-DD'),
      representant,
      nExpedition,
      statut,
      souche: nDocumentSouche,
      nDocument: { numero: nDocumentNumero },
      port
    }

    if (typeof onValidate !== 'function') {
      console.warn('DocumentHeaderForm: no onValidate handler provided', formData)
      return
    }

    try {
      setSubmitting(true)
      // Support both sync and async onValidate handlers so the button
      // stays disabled for the duration of a real network call.
      await onValidate(formData)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="shrink-0 bg-[#f0f0f0] px-3 py-3 grid grid-cols-3 gap-x-6 gap-y-2 border-b border-gray-300">
      {/* Column 1 */}
      <div className="flex flex-col gap-2">
        <LabeledField label="Client">
          <span className="text-[12px] text-blue-700 underline w-14 shrink-0">Numéro</span>
          <Select
            size="small"
            className="flex-1 max-w-full"
            status={errors.client ? 'error' : undefined}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={clientOptions}
            value={client}
            loading={optionsLoading.client}
            disabled={piece}
            onChange={(v) => {
              setClient(v)
              clearError('client')
            }}
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </LabeledField>
        {errors.client && (
          <span className="text-[11px] text-red-600 ml-[104px]">{errors.client}</span>
        )}
        {optionsError.client && (
          <span className="text-[11px] text-red-600 ml-[104px]">{optionsError.client}</span>
        )}

        <LabeledField label="Statut">
          <Select
            size="small"
            className="w-32"
            status={errors.statut ? 'error' : undefined}
            onChange={(v) => {
              setStatut(v)
              clearError('statut')
            }}
            value={statut}
            loading={optionsLoading.statut}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={statutOptions}
          />
          <Select size="small" disabled className="flex-1" />
        </LabeledField>
        {errors.statut && (
          <span className="text-[11px] text-red-600 ml-[104px]">{errors.statut}</span>
        )}
        {optionsError.statut && (
          <span className="text-[11px] text-red-600 ml-[104px]">{optionsError.statut}</span>
        )}

        <LabeledField label="Affaire">
          <Select size="small" className="flex-1" value={affaire} onChange={setAffaire} />
        </LabeledField>

        <LabeledField label="Expédition">
          <Select
            size="small"
            className="flex-1"
            status={errors.expedition ? 'error' : undefined}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={expeditionOptions}
            value={expedition}
            loading={optionsLoading.expedition}
            onChange={(v) => {
              setExpedition(v)
              clearError('expedition')
            }}
          />
        </LabeledField>
        {errors.expedition && (
          <span className="text-[11px] text-red-600 ml-[104px]">{errors.expedition}</span>
        )}
        {optionsError.expedition && (
          <span className="text-[11px] text-red-600 ml-[104px]">{optionsError.expedition}</span>
        )}
      </div>

      {/* Column 2 */}
      <div className="flex flex-col gap-2">
        <LabeledField label="Date" labelWidth={70}>
          <DatePicker
            size="small"
            value={date}
            status={errors.date ? 'error' : undefined}
            onChange={(v) => {
              setDate(v)
              clearError('date')
            }}
            format="DDMMYY"
            disabled={piece}
            className="w-full"
            allowClear={false}
          />
        </LabeledField>
        {errors.date && <span className="text-[11px] text-red-600 ml-[78px]">{errors.date}</span>}

        <LabeledField label="Date livraison" labelWidth={70}>
          <Select
            size="small"
            value={dateLivraisonStatut}
            onChange={setDateLivraisonStatut}
            className="w-24"
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={[{ value: 'Prévue', label: 'Prévue' }]}
          />
          <DatePicker
            size="small"
            value={dateLivraison}
            status={errors.dateLivraison ? 'error' : undefined}
            onChange={(v) => {
              setDateLivraison(v)
              clearError('dateLivraison')
            }}
            placeholder="Date livraison"
            format="DDMMYY"
            disabledDate={(current) => current && current.startOf('day').isBefore(TODAY)}
            locale="fr"
            className="w-full"
            allowClear={false}
          />
        </LabeledField>
        {errors.dateLivraison && (
          <span className="text-[11px] text-red-600 ml-[78px]">{errors.dateLivraison}</span>
        )}

        <LabeledField label="Représentant" labelWidth={70}>
          <Select size="small" className="flex-1" value={representant} onChange={setRepresentant} />
        </LabeledField>

        <LabeledField label="N° Expédition" labelWidth={70}>
          <Input
            size="small"
            className="flex-1"
            value={nExpedition}
            onChange={(e) => setNExpedition(e.target.value)}
          />
        </LabeledField>
      </div>

      {/* Column 3 */}
      <div className="flex flex-col gap-2">
        <LabeledField label="N° document" labelWidth={80}>
          <Select
            size="small"
            value={nDocumentSouche}
            status={errors.souche ? 'error' : undefined}
            onChange={(v) => {
              setNDocumentSouche(v)
              clearError('souche')
            }}
            className="w-28"
            disabled={piece}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={[
              { value: 'Souche A', label: 'Souche A' },
              { value: 'Souche B', label: 'Souche B' }
            ]}
          />
          <Input size="small" disabled value={nDocumentNumero} className="flex-1" />
        </LabeledField>
        {errors.souche && (
          <span className="text-[11px] text-red-600 ml-[88px]">{errors.souche}</span>
        )}

        <LabeledField label="Référence" labelWidth={80}>
          <Input
            size="small"
            status={errors.reference ? 'error' : undefined}
            value={reference}
            onChange={(e) => {
              setReference(e.target.value)
              clearError('reference')
            }}
            className="flex-1"
          />
        </LabeledField>
        {errors.reference && (
          <span className="text-[11px] text-red-600 ml-[88px]">{errors.reference}</span>
        )}

        <LabeledField label="Type" labelWidth={80}>
          <Select
            size="small"
            className="w-full"
            status={errors.type ? 'error' : undefined}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            value={type}
            onChange={(v) => {
              setType(v)
              clearError('type')
            }}
            options={[
              { value: 'Cuisine', label: 'Cuisine' },
              { value: 'Placard', label: 'Placard' },
              { value: 'Laca', label: 'Laca' },
              { value: 'Stock', label: 'Stock' },
              { value: 'Polilaminado', label: 'Polilaminado' },
              { value: 'Parquet', label: 'Parquet' }
            ]}
          />
        </LabeledField>
        {errors.type && <span className="text-[11px] text-red-600 ml-[88px]">{errors.type}</span>}

        <LabeledField label="Port" labelWidth={80}>
          <Input
            size="small"
            className="flex-1"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            onPressEnter={handleValidate}
            disabled={submitting}
          />
          <Button
            size="small"
            type="primary"
            ghost
            className="!border-blue-400 !text-blue-600"
            onClick={handleValidate}
            loading={submitting}
          >
            Valider
          </Button>
        </LabeledField>
      </div>
    </div>
  )
}
