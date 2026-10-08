import { message } from 'antd'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api } from '../utils/api'
import { getAvailableStatuts, getStatut } from '../utils/helpers'
import {
  DEFAULT_STATUT,
  DOCUMENT_TYPES,
  FIELD_LABELS,
  REQUIRED_FIELDS
} from '../constants/documentTypes'
import { TODAY, toDayjsOrNull } from '../utils/dateUtils'
import ClientColumn from './ClientColumn'
import DateColumn from './DateColumn'
import DocumentColumn from './DocumentColumn'

const DATE_LIVRAISON_RESTRICTED_TYPES = [0, 1, 2]
const DEFAULT_SOUCHE = 'Souche A'

const DocumentHeaderForm = forwardRef(function DocumentHeaderForm(
  { onValidate, piece, document: doc, documentType, onDataChange },
  ref
) {
  const [clientOptions, setClientOptions] = useState([])
  const [expeditionOptions, setExpeditionOptions] = useState([])

  const [optionsLoading, setOptionsLoading] = useState({
    client: true,
    expedition: true
  })
  const [optionsError, setOptionsError] = useState({})

  const [client, setClient] = useState(null)
  const [affaire, setAffaire] = useState(null)
  const [expedition, setExpedition] = useState('EX-WORK')
  const [date, setDate] = useState(TODAY)
  const [dateLivraisonStatut, setDateLivraisonStatut] = useState('Prévue')
  const [dateLivraison, setDateLivraison] = useState(null)
  const [statutValue, setStatutValue] = useState(DEFAULT_STATUT.value)

  const [representant, setRepresentant] = useState(null)
  const [nExpedition, setNExpedition] = useState(undefined)
  const [nDocumentSouche, setNDocumentSouche] = useState(DEFAULT_SOUCHE)
  const [nDocumentNumero, setNDocumentNumero] = useState('')
  const [reference, setReference] = useState('')
  const [type, setType] = useState(null)

  const [port, setPort] = useState('')
  const [collaborateurs, setCollaborateurs] = useState([])

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Ref guard: state updates are async, so two fast submits could both pass
  // a `submitting` state check. The ref flips synchronously.
  const submittingRef = useRef(false)

  // The "documentType" prop is the type the page was opened with. Once a
  // document is loaded, its own `doType` is the source of truth for statuses.
  const statutDocType =
    doc?.doType ?? DOCUMENT_TYPES.find((item) => item.type === documentType)?.value

  // Auto-submit only when editing an existing document (not on create).
  const canAutoSubmit = Boolean(piece || doc?.piece)

  // ---------------------------------------------------------
  // Load async options
  // ---------------------------------------------------------

  useEffect(() => {
    const loaders = [
      [
        'client',
        '/clients/short?type=0',
        (c) => ({ value: c.code, label: `${c.code} ${c.intitule}` }),
        setClientOptions
      ],
      ['expedition', '/expeditions', (e) => ({ value: e, label: e }), setExpeditionOptions]
    ]

    loaders.forEach(async ([key, path, mapFn, setter]) => {
      try {
        const { data } = await api.get(path)
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
    })
  }, [])

  // ---------------------------------------------------------
  // Load collaborateurs
  // ---------------------------------------------------------

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
        console.error(error)
      }
    }
    fetchCollaborateurs()
  }, [])

  // ---------------------------------------------------------
  // Re-sync when document arrives
  // ---------------------------------------------------------

  useEffect(() => {
    if (!piece || !doc) return

    setClient(doc.clientCode ?? null)
    setAffaire(doc.affaire ?? null)
    setExpedition(doc.expedition || 'EX-WORK')
    setDate(toDayjsOrNull(doc.date) ?? TODAY)
    setDateLivraison(toDayjsOrNull(doc.dateLivraison))
    setStatutValue(doc.statut ?? DEFAULT_STATUT.value)
    setRepresentant(doc.collaborateur ?? null)
    setNExpedition(doc.nExpedition)
    setNDocumentSouche(doc.souche ?? DEFAULT_SOUCHE)
    setNDocumentNumero(piece)
    setReference(doc.ref ?? '')
    setType(doc.type ?? null)
    setPort(doc.port ?? '')
  }, [piece, doc])

  // ---------------------------------------------------------
  // Next piece number (create mode only)
  // ---------------------------------------------------------

  useEffect(() => {
    // When editing, keep the existing number instead of overwriting it.
    if (piece) return

    const getNextPiece = async () => {
      try {
        const response = await api.get(
          `documents/${documentType}/next-piece?souche=${nDocumentSouche ?? ''}`
        )
        setNDocumentNumero(response?.data?.piece ?? '')
      } catch (error) {
        console.error(error)
      }
    }
    getNextPiece()
  }, [nDocumentSouche, piece, documentType])

  // ---------------------------------------------------------
  // Errors
  // ---------------------------------------------------------

  const clearError = (field) =>
    setErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })

  // ---------------------------------------------------------
  // Snapshot / validate / submit
  // ---------------------------------------------------------

  // Values the form would submit, with overrides applied on top so that
  // auto-submit uses the freshly-changed value instead of stale state.
  const buildSnapshot = (overrides = {}) => ({
    reference,
    client,
    date,
    dateLivraison,
    dateLivraisonStatut,
    statutValue,
    expedition,
    type,
    souche: nDocumentSouche,
    affaire,
    representant,
    nExpedition,
    port,
    ...overrides
  })

  const validate = (snap) => {
    const newErrors = {}

    REQUIRED_FIELDS.forEach((field) => {
      // REQUIRED_FIELDS uses `statut` but our state key is `statutValue`
      const key = field === 'statut' ? 'statutValue' : field
      const v = snap[key]
      if (v === null || v === undefined || v === '') {
        newErrors[field] = `${FIELD_LABELS[field]} est obligatoire`
      }
    })

    const isDateLivraisonRestricted = DATE_LIVRAISON_RESTRICTED_TYPES.includes(
      Number(statutDocType)
    )

    if (
      isDateLivraisonRestricted &&
      snap.dateLivraison &&
      snap.dateLivraison.startOf('day').isBefore(TODAY)
    ) {
      newErrors.dateLivraison = "La date de livraison ne peut pas être antérieure à aujourd'hui"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Resolves to true when the save went through, false when it was skipped
  // (already submitting, validation failed, no handler). Rejects if
  // onValidate throws, so callers can react to failures.
  const handleValidate = async (overrides = {}) => {
    if (submittingRef.current) return false

    const snap = buildSnapshot(overrides)

    if (!validate(snap)) return false

    const statutObj = getStatut(statutDocType, snap.statutValue) ?? DEFAULT_STATUT

    const formData = {
      documentType,
      clientCode: snap.client,
      reference: snap.reference,
      type: snap.type,
      affaire: snap.affaire,
      expedition: snap.expedition,
      date: snap.date?.format('DDMMYY'),
      dateLivraisonStatut: snap.dateLivraisonStatut,
      dateLivraison: snap.dateLivraison?.format('YYYY-MM-DD') ?? null,
      representant: snap.representant,
      nExpedition: snap.nExpedition,
      statut: statutObj.name,
      souche: snap.souche,
      nDocument: {
        numero: nDocumentNumero
      },
      port: snap.port
    }

    if (typeof onValidate !== 'function') {
      console.warn('DocumentHeaderForm: no onValidate handler provided', formData)
      return false
    }

    try {
      submittingRef.current = true
      setSubmitting(true)
      await onValidate(formData)
      return true
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Auto-submit: errors are already reported by the parent's handler,
  // so swallow the rejection here to avoid unhandled promise warnings.
  const autoSubmit = (overrides) => {
    if (!canAutoSubmit) return
    handleValidate(overrides).catch(() => {})
  }

  // ---------------------------------------------------------
  // Imperative API (used by the parent, e.g. after a WhatsApp send)
  // ---------------------------------------------------------

  useImperativeHandle(ref, () => ({
    // Saves the whole form with a new status. Resolves to true on success.
    submitWithStatut: (newStatutValue) => {
      setStatutValue(newStatutValue)
      clearError('statut')
      return handleValidate({ statutValue: newStatutValue })
    }
  }))

  // ---------------------------------------------------------
  // Field change handlers
  // ---------------------------------------------------------

  const getValue = (value) => (value?.target ? value.target.value : value)

  const onChange = (setter, field) => (value) => {
    setter(getValue(value))
    clearError(field)
  }

  const handleClientChange = (value) => {
    const v = getValue(value)
    setClient(v)
    clearError('client')
    autoSubmit({ client: v })
  }

  const handleStatutChange = (value) => {
    setStatutValue(value)
    clearError('statut')
    autoSubmit({ statutValue: value })
  }

  const handleExpeditionChange = (value) => {
    const v = getValue(value)
    setExpedition(v)
    clearError('expedition')
    autoSubmit({ expedition: v })
  }

  const handleTypeChange = (value) => {
    const v = getValue(value)
    setType(v)
    clearError('type')
    autoSubmit({ type: v })
    const ref = document.getElementById('documentReference')
    if (ref.value === '') ref.focus()
  }

  // const focusdateLivraison = () =>

  const handleDateLivraisonChange = (value) => {
    setDateLivraison(value)
    clearError('dateLivraison')
    autoSubmit({ dateLivraison: value })
  }

  // ---------------------------------------------------------
  // Collaborateur
  // ---------------------------------------------------------

  const addCollaborateur = async (value) => {
    const old = representant
    try {
      await api.patch(`/documents/${documentType}/${piece}/collaborateur`, {
        nom: value,
        prenom: ''
      })
      setRepresentant(value)
    } catch (error) {
      setRepresentant(old)
      message.warning(
        error.response?.data?.message || `Le collaborateur "${value}" n’est pas un vendeur.`
      )
      console.error(error.response?.data ?? error)
    }
  }

  // ---------------------------------------------------------
  // Enter key → submit
  // ---------------------------------------------------------

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return

    // Ignore Shift+Enter and IME composition
    if (event.shiftKey || event.nativeEvent?.isComposing) return

    // Don't hijack Enter inside a textarea
    const tag = event.target?.tagName?.toLowerCase()
    if (tag === 'textarea') return

    // Don't hijack Enter inside an Ant Design Select (dropdown confirm)
    if (event.target?.getAttribute?.('role') === 'combobox') return
    if (event.target?.closest?.('.ant-select')) return

    event.preventDefault()
    handleValidate().catch(() => {})
  }

  // ---------------------------------------------------------
  // Available statuses
  // ---------------------------------------------------------

  const statuses = getAvailableStatuts(statutDocType)

  useEffect(() => {
    onDataChange?.({ client, reference, statutValue, representant })
  }, [client, reference, statutValue, representant])

  return (
    <div
      onKeyDown={handleKeyDown}
      className="shrink-0 bg-[#f0f0f0] px-3 py-3 grid grid-cols-3 gap-x-6 gap-y-2 border-b border-gray-300"
    >
      <ClientColumn
        client={{
          value: client,
          options: clientOptions,
          loading: optionsLoading.client,
          error: optionsError.client,
          fieldError: errors.client,
          disabled: piece,
          onChange: handleClientChange
        }}
        statut={{
          value: statutValue,
          options: statuses,
          error: errors.statut,
          onChange: handleStatutChange
        }}
        affaire={{
          value: affaire,
          onChange: setAffaire
        }}
        expedition={{
          value: expedition,
          options: expeditionOptions,
          loading: optionsLoading.expedition,
          error: optionsError.expedition,
          fieldError: errors.expedition,
          onChange: handleExpeditionChange
        }}
      />

      <DateColumn
        date={{
          value: date,
          error: errors.date,
          disabled: piece,
          onChange: onChange(setDate, 'date')
        }}
        dateLivraison={{
          statutValue: dateLivraisonStatut,
          onStatutChange: setDateLivraisonStatut,
          value: dateLivraison,
          error: errors.dateLivraison,
          onChange: handleDateLivraisonChange
        }}
        representant={{
          value: representant,
          options: collaborateurs,
          disabled: !piece,
          onChange: addCollaborateur
        }}
        typeValue={type}
        nExpedition={{
          value: nExpedition,
          onChange: (e) => setNExpedition(e.target.value)
        }}
      />

      <DocumentColumn
        souche={{
          value: nDocumentSouche,
          error: errors.souche,
          disabled: piece,
          onChange: onChange(setNDocumentSouche, 'souche')
        }}
        numero={nDocumentNumero}
        reference={{
          value: reference,
          error: errors.reference,
          onChange: onChange(setReference, 'reference')
        }}
        type={{
          value: type,
          error: errors.type,
          onChange: handleTypeChange
        }}
        port={{
          value: port,
          onChange: (e) => setPort(e.target.value)
        }}
        submitting={submitting}
        onValidate={() => handleValidate().catch(() => {})}
      />
    </div>
  )
})

export default DocumentHeaderForm
