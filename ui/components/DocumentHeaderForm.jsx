import { Button, DatePicker, Input, message, Select } from 'antd'
import { useEffect, useState } from 'react'
import { DownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { api } from '../utils/api'

dayjs.extend(customParseFormat)
const TODAY = dayjs().startOf('day')

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

const toDayjsOrNull = (v) => {
  if (!v) return null
  const d = dayjs(v)
  return d.isValid() ? d : null
}

const LabeledField = ({ label, labelWidth = 96, children }) => (
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

const FieldError = ({ error, offset = 104 }) =>
  error ? (
    <span className="text-[11px] text-red-600" style={{ marginLeft: offset }}>
      {error}
    </span>
  ) : null

export default function DocumentHeaderForm({ onValidate, piece, document, documentType }) {
  const [clientOptions, setClientOptions] = useState([])
  const [expeditionOptions, setExpeditionOptions] = useState([])
  const [statutOptions, setStatutOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState({
    client: true,
    expedition: true,
    statut: true
  })
  const [optionsError, setOptionsError] = useState({})

  const [client, setClient] = useState(null)
  const [affaire, setAffaire] = useState(null)
  const [expedition, setExpedition] = useState('EX-WORK')
  const [date, setDate] = useState(TODAY)
  const [dateLivraisonStatut, setDateLivraisonStatut] = useState('Prévue')
  const [dateLivraison, setDateLivraison] = useState(null)
  const [statut, setStatut] = useState('DocumentStatutTypeSaisie')
  const [representant, setRepresentant] = useState(null)
  const [nExpedition, setNExpedition] = useState(undefined)
  const [nDocumentSouche, setNDocumentSouche] = useState('Souche A')
  const [nDocumentNumero, setNDocumentNumero] = useState('23DE000438')
  const [reference, setReference] = useState('')
  const [type, setType] = useState(null)
  const [port, setPort] = useState('')
  const [collaborateurs, setCollaborateurs] = useState([])

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Load async options
  useEffect(() => {
    const loaders = [
      [
        'client',
        '/clients?max=1000',
        (c) => ({ value: c.code, label: `${c.code} ${c.intitule}` }),
        setClientOptions
      ],
      ['expedition', '/expeditions', (e) => ({ value: e, label: e }), setExpeditionOptions],
      [
        'statut',
        `/documents/${documentType}/statuts`,
        (s) => ({ value: s.value, label: s.label }),
        setStatutOptions
      ]
    ]

    Promise.all(
      loaders.map(async ([key, path, mapFn, setter]) => {
        try {
          const { data } = await api.get(path)
          setter(data.map(mapFn))
        } catch (error) {
          console.error(`API Error (${path}):`, error)
          setOptionsError((prev) => ({ ...prev, [key]: 'Impossible de charger les options' }))
        } finally {
          setOptionsLoading((prev) => ({ ...prev, [key]: false }))
        }
      })
    )
  }, [documentType])

  // Re-sync when the document arrives
  useEffect(() => {
    if (!piece || !document) return

    setClient(document.clientCode ?? null)
    setAffaire(document.affaire ?? null)
    setExpedition(document.expedition || 'EX-WORK')
    setDate(toDayjsOrNull(document.date) ?? TODAY)
    setDateLivraison(toDayjsOrNull(document.dateLivraison))
    setStatut(document.statut ?? 'DocumentStatutTypeSaisie')
    setRepresentant(document.collaborateur ?? null)
    setNExpedition(document.nExpedition)
    setNDocumentSouche(document.souche ?? 'Souche A')
    setNDocumentNumero(piece ?? '23DE000438')
    setReference(document.ref ?? '')
    setType(document.type ?? null)
    setPort(document.port ?? '')
  }, [piece, document])

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })

  const onChange = (setter, field) => (v) => {
    setter(v?.target ? v.target.value : v)
    clearError(field)
  }

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
      const v = values[field]
      if (v === null || v === undefined || v === '') {
        newErrors[field] = `${FIELD_LABELS[field]} est obligatoire`
      }
    })

    if (dateLivraison && dateLivraison.startOf('day').isBefore(TODAY)) {
      newErrors.dateLivraison = "La date de livraison ne peut pas être antérieure à aujourd'hui"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleValidate = async () => {
    if (submitting || !validate()) return

    const formData = {
      documentType,
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
      await onValidate(formData)
    } finally {
      setSubmitting(false)
    }
  }

  const addCollaborateur = async (value) => {
    let old = representant

    try {
      await api.patch(`/documents/${documentType}/${piece}/collaborateur`, {
        nom: value,
        prenom: ''
      })
      setRepresentant(value)
    } catch (error) {
      setRepresentant(old)
      message.warning('Le collaborateur "' + value + '" n’est pas un vendeur.')
      console.error(error)
    }
  }

  useEffect(() => {
    const fetchCollaborateurs = async () => {
      try {
        const response = await api.get('collaborateurs')

        setCollaborateurs(
          response.data.map((coll) => ({
            label: `${coll.nom} ${coll.prenom}`,
            value: coll.nom
          }))
        )
      } catch (error) {
        console.log(error)
      }
    }

    fetchCollaborateurs()
  }, [])

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
            onChange={onChange(setClient, 'client')}
            showSearch={{
              optionFilterProp: 'label',
              filterOption: (input, option) =>
                option?.label?.toLowerCase().includes(input.toLowerCase())
            }}
          />
        </LabeledField>
        <FieldError error={errors.client || optionsError.client} />

        <LabeledField label="Statut">
          <Select
            size="small"
            className="w-54"
            status={errors.statut ? 'error' : undefined}
            value={statut}
            loading={optionsLoading.statut}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            options={statutOptions}
            onChange={onChange(setStatut, 'statut')}
          />
          <Select size="small" disabled className="flex-1" />
        </LabeledField>

        <FieldError error={errors.statut || optionsError.statut} />

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
            onChange={onChange(setExpedition, 'expedition')}
          />
        </LabeledField>
        <FieldError error={errors.expedition || optionsError.expedition} />
      </div>

      {/* Column 2 */}
      <div className="flex flex-col gap-2">
        <LabeledField label="Date" labelWidth={70}>
          <DatePicker
            size="small"
            value={date}
            status={errors.date ? 'error' : undefined}
            onChange={onChange(setDate, 'date')}
            format="DDMMYY"
            disabled={piece}
            className="w-full"
            allowClear={false}
          />
        </LabeledField>
        <FieldError error={errors.date} offset={78} />

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
            onChange={onChange(setDateLivraison, 'dateLivraison')}
            placeholder="Date livraison"
            format="DDMMYY"
            disabledDate={(current) => current && current.startOf('day').isBefore(TODAY)}
            className="w-full"
            allowClear={false}
          />
        </LabeledField>
        <FieldError error={errors.dateLivraison} offset={78} />

        <LabeledField label="Représentant" labelWidth={70}>
          <Select
            size="small"
            className="flex-1"
            options={collaborateurs}
            value={representant}
            disabled={!piece}
            onChange={(value) => addCollaborateur(value)}
          />
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
            onChange={onChange(setNDocumentSouche, 'souche')}
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
        <FieldError error={errors.souche} offset={88} />

        <LabeledField label="Référence" labelWidth={80}>
          <Input
            size="small"
            status={errors.reference ? 'error' : undefined}
            value={reference}
            onChange={onChange(setReference, 'reference')}
            className="flex-1"
          />
        </LabeledField>
        <FieldError error={errors.reference} offset={88} />

        <LabeledField label="Type" labelWidth={80}>
          <Select
            size="small"
            className="w-full"
            status={errors.type ? 'error' : undefined}
            suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
            value={type}
            onChange={onChange(setType, 'type')}
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
        <FieldError error={errors.type} offset={88} />

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
