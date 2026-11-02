import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, DatePicker, Divider, InputNumber, Select, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { api } from '../utils/api'

const PAYMENT_LABELS = {
  1: 'Espéce',
  2: 'Chéque',
  3: 'Virement',
  4: 'Vérsement',
  5: 'Carte Bancaire',
  6: 'Lettre de Change'
}

const PAYMENT_OPTIONS = Object.values(PAYMENT_LABELS).map((label) => ({
  value: label,
  label
}))

const field = (item, name) => item?.[name] ?? item?.[name.charAt(0).toUpperCase() + name.slice(1)]

const asBoolean = (value) => value === true || value === 1 || value === '1'

function asNumber(value) {
  if (value == null || value === '') return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function formatMoney(value) {
  const number = asNumber(value)

  if (number == null) return '—'

  return number.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function errorMessage(error) {
  const data = error.response?.data

  if (typeof data === 'string') return data

  if (data?.errors) {
    return Object.values(data.errors).flat().join(' ')
  }

  return data?.message || data?.detail || data?.title || error.message || 'Une erreur est survenue.'
}

function assertSuccess(response) {
  if (field(response.data, 'success') !== true) {
    const error = new Error(field(response.data, 'message') || "L'enregistrement a échoué.")

    error.response = response
    throw error
  }
}

function mapRows(data) {
  if (!Array.isArray(data)) {
    throw new Error("Réponse de l'échéancier invalide.")
  }

  const ids = new Set()

  return data.map((item) => {
    const no = Number(field(item, 'no'))

    if (!Number.isSafeInteger(no) || no <= 0 || ids.has(no)) {
      throw new Error("Identifiant d'échéance invalide.")
    }

    ids.add(no)

    const rawDate = field(item, 'date')

    return {
      key: `existing-${no}`,
      no,
      date: rawDate && dayjs(rawDate).isValid() ? dayjs(rawDate) : null,

      pourcent: asNumber(field(item, 'pourcent')) ?? 0,

      // Valeurs de saisie envoyées au backend.
      montant: asNumber(field(item, 'montant')),
      devises: asNumber(field(item, 'devises')),

      // Valeurs calculées utilisées pour l'affichage.
      montantCalcule: asNumber(field(item, 'montantCalcule')),
      devisesCalcule: asNumber(field(item, 'devisesCalcule')),

      modeReglement:
        field(item, 'modeReglement') ||
        field(item, 'reglementLibelle') ||
        PAYMENT_LABELS[Number(field(item, 'reglement'))] ||
        null,

      equil: asBoolean(field(item, 'equil')),
      regle: asBoolean(field(item, 'regle')),
      isFirst: asBoolean(field(item, 'isFirst'))
    }
  })
}

function mapModel(data) {
  const options = field(data, 'options')
  const value = field(data, 'value')

  if (!Array.isArray(options) || typeof value !== 'string') {
    throw new Error('Réponse du modèle de règlement invalide.')
  }

  return {
    value,
    options: options.map((option) => ({
      value: field(option, 'value'),
      label: field(option, 'label'),
      kind: field(option, 'kind'),
      intitule: field(option, 'intitule') ?? null
    }))
  }
}

function editablePayload(rows) {
  return rows
    .filter((row) => !row.equil)
    .map((row, index) => {
      const prefix = `Ligne ${index + 1} : `

      if (!row.date?.isValid()) {
        throw new Error(prefix + 'renseignez une date.')
      }

      const percent = asNumber(row.pourcent)

      if (percent == null || percent < 0 || percent > 100) {
        throw new Error(prefix + 'le pourcentage doit être entre 0 et 100.')
      }

      if (row.no == null && !row.modeReglement) {
        throw new Error(prefix + 'sélectionnez un mode de règlement.')
      }

      const percentageMode = percent > 0
      const amount = asNumber(row.montant)
      const currencyAmount = asNumber(row.devises)

      if (!percentageMode && amount == null) {
        throw new Error(prefix + 'renseignez un montant.')
      }

      if (!percentageMode && row.devises != null && currencyAmount == null) {
        throw new Error(prefix + 'le montant en devises est invalide.')
      }

      return {
        no: row.no ?? null,
        date: row.date.format('YYYY-MM-DD'),
        pourcent: percentageMode ? percent : 0,
        montant: percentageMode ? null : amount,
        devises: percentageMode ? null : currencyAmount,
        modeReglement: row.modeReglement || null
      }
    })
}

function balancePayload(row) {
  return {
    date: row.date?.format('YYYY-MM-DD') ?? null,
    modeReglement: row.modeReglement || null
  }
}

// Comparer indépendamment de l'ordre des lignes retournées.
function payloadSignature(payload) {
  return JSON.stringify([...payload].sort((a, b) => (a.no ?? Infinity) - (b.no ?? Infinity)))
}

export default function EcheancierTab(props) {
  return (
    <EcheancierEditor key={`${props.documentType ?? ''}:${props.documentPiece ?? ''}`} {...props} />
  )
}

function EcheancierEditor({
  documentPiece,
  documentType,
  totalTTC = null,
  acomptes = null,
  netAPayer = null,
  netAPayerMAD = null,
  readOnly = false,

  // Activer seulement pour un document en devise.
  // Les montants disponibles restent affichés même si false.
  enableDevises = false
}) {
  const [rows, setRows] = useState([])
  const [model, setModel] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const alive = useRef(false)
  const busy = useRef(false)
  const readyRef = useRef(false)
  const dirtyRef = useRef(false)
  const rowsRef = useRef([])
  const baseline = useRef([])
  const saveTimer = useRef(null)
  const saveRef = useRef(null)
  const requestSequence = useRef(0)
  const nextId = useRef(0)
  const protectedKey = useRef(null)

  const endpoint = `documents/${encodeURIComponent(documentPiece || '')}/echeancier`

  const modelEndpoint = `documents/${encodeURIComponent(documentPiece || '')}/modele-reglement`

  const replaceRows = useCallback((next) => {
    rowsRef.current = next
    setRows(next)
  }, [])

  const markDirty = (value) => {
    dirtyRef.current = value
    setDirty(value)
  }

  const loadData = useCallback(async () => {
    if (!documentPiece || !alive.current) return false

    const sequence = ++requestSequence.current
    const params = documentType == null ? {} : { type: documentType }

    readyRef.current = false
    setReady(false)
    setLoading(true)

    try {
      const [rowsResponse, modelResponse] = await Promise.all([
        api.get(`documents/${encodeURIComponent(documentPiece)}/echeancier`, { params }),
        api.get(`documents/${encodeURIComponent(documentPiece)}/modele-reglement`, { params })
      ])

      const nextRows = mapRows(rowsResponse.data)
      const nextModel = mapModel(modelResponse.data)

      if (!alive.current || sequence !== requestSequence.current) {
        return false
      }

      // Utiliser le marqueur serveur lorsqu'il est disponible.
      protectedKey.current = nextRows.find((row) => row.isFirst)?.key ?? nextRows[0]?.key ?? null

      baseline.current = nextRows
      replaceRows(nextRows)
      setModel(nextModel)
      setSelectedKeys([])

      dirtyRef.current = false
      setDirty(false)

      readyRef.current = true
      setReady(true)

      return true
    } catch (err) {
      if (alive.current && sequence === requestSequence.current) {
        setError(errorMessage(err))
        setStatus('Chargement impossible.')
      }

      return false
    } finally {
      if (alive.current && sequence === requestSequence.current) {
        setLoading(false)
      }
    }
  }, [documentPiece, documentType, replaceRows])

  useEffect(() => {
    alive.current = true
    void loadData()

    return () => {
      alive.current = false
      readyRef.current = false
      requestSequence.current += 1
      clearTimeout(saveTimer.current)
    }
  }, [loadData])

  useEffect(() => {
    if (!dirty && !saving) return undefined

    const preventUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', preventUnload)

    return () => {
      window.removeEventListener('beforeunload', preventUnload)
    }
  }, [dirty, saving])

  const hasPaidRows = rows.some((row) => row.regle)
  const locked = readOnly || hasPaidRows || !ready || loading || saving

  const commitLocal = (next) => {
    replaceRows(next)
    markDirty(true)
    setError('')
    setStatus('Modification en attente…')

    clearTimeout(saveTimer.current)

    saveTimer.current = setTimeout(() => {
      void saveRef.current?.()
    }, 900)
  }

  const handleChange = (key, name, value) => {
    if (locked || busy.current) return

    const target = rowsRef.current.find((row) => row.key === key)

    if (!target || target.regle) return

    // La date et le règlement de la ligne d'équilibrage sont modifiables.
    // Son montant est calculé par Sage.
    if (target.equil && !['date', 'modeReglement'].includes(name)) {
      return
    }

    const next = rowsRef.current.map((row) => {
      if (row.key !== key) return row

      const updated = { ...row, [name]: value }

      if (name === 'pourcent' && Number(value) > 0) {
        updated.montant = 0
        updated.devises = null

        // Ne pas afficher l'ancien résultat comme un nouveau calcul.
        updated.montantCalcule = null
        updated.devisesCalcule = null
      }

      if (name === 'montant') {
        updated.pourcent = 0

        // Le backend recalculera la devise à partir du montant.
        updated.devises = null
        updated.devisesCalcule = null
      }

      if (name === 'devises') {
        updated.pourcent = 0
      }

      return updated
    })

    commitLocal(next)
  }

  const handleAdd = () => {
    if (locked || busy.current) return

    const row = {
      key: `new-${++nextId.current}`,
      no: null,
      date: dayjs(),
      pourcent: 0,
      montant: null,
      devises: null,
      montantCalcule: null,
      devisesCalcule: null,
      modeReglement: null,
      equil: false,
      regle: false,
      isFirst: false
    }

    commitLocal([...rowsRef.current, row])
  }

  const canDelete = (row) => !row.equil && !row.regle && row.key !== protectedKey.current

  const handleDelete = () => {
    if (locked || busy.current) return

    const selected = new Set(selectedKeys)

    const next = rowsRef.current.filter((row) => !selected.has(row.key) || !canDelete(row))

    if (next.length === rowsRef.current.length) return

    setSelectedKeys([])
    commitLocal(next)
  }

  const saveAutomatically = async () => {
    if (
      busy.current ||
      !alive.current ||
      !readyRef.current ||
      readOnly ||
      rowsRef.current.some((row) => row.regle)
    ) {
      return
    }

    const current = rowsRef.current
    const original = baseline.current

    let payload
    let oldPayload
    let balanceChanges

    try {
      payload = editablePayload(current)
      oldPayload = editablePayload(original)

      balanceChanges = current.filter((row) => {
        if (!row.equil) return false

        const previous = original.find((item) => item.no === row.no)

        return (
          previous &&
          JSON.stringify(balancePayload(row)) !== JSON.stringify(balancePayload(previous))
        )
      })

      for (const row of balanceChanges) {
        if (!row.date?.isValid()) {
          throw new Error("Renseignez la date de l'échéance d'équilibrage.")
        }
      }
    } catch (err) {
      setStatus(err.message)
      return
    }

    const scheduleChanged = payloadSignature(payload) !== payloadSignature(oldPayload)

    if (!scheduleChanged && balanceChanges.length === 0) {
      markDirty(false)
      setStatus('À jour')
      return
    }

    busy.current = true
    setSaving(true)
    setError('')
    setStatus('Enregistrement…')

    const params = documentType == null ? {} : { type: documentType }
    let completedWrites = 0

    try {
      for (const row of balanceChanges) {
        const response = await api.patch(`${endpoint}/${row.no}`, balancePayload(row), { params })

        assertSuccess(response)
        completedWrites += 1
      }

      if (scheduleChanged) {
        const response = await api.post(endpoint, payload, { params })

        assertSuccess(response)
        completedWrites += 1
      }

      if (!alive.current) return

      const refreshed = await loadData()

      if (alive.current && refreshed) {
        setStatus('Enregistré automatiquement')
      }
    } catch (err) {
      if (!alive.current) return

      setError(errorMessage(err))

      const data = err.response?.data
      const mustReload =
        completedWrites > 0 ||
        !err.response ||
        data?.reloadRequired ||
        data?.partialChangesPossible ||
        err.response?.status >= 500

      if (mustReload) {
        const refreshed = await loadData()

        if (alive.current && refreshed) {
          setStatus('Données relues. Vérifiez les modifications restantes.')
        }
      } else {
        setStatus('Non enregistré : corrigez la valeur pour réessayer.')
      }
    } finally {
      busy.current = false

      if (alive.current) {
        setSaving(false)
      }
    }
  }

  saveRef.current = saveAutomatically

  const handleModelChange = async (value) => {
    if (locked || busy.current || dirtyRef.current || value === model?.value) {
      return
    }

    const option = model?.options.find((item) => item.value === value)

    if (!option) return

    clearTimeout(saveTimer.current)

    busy.current = true
    setSaving(true)
    setError('')
    setStatus('Application du modèle et génération des échéances…')

    const params = documentType == null ? {} : { type: documentType }

    try {
      const response = await api.put(
        modelEndpoint,
        {
          kind: option.kind,
          intitule: option.intitule
        },
        { params }
      )

      assertSuccess(response)

      if (!alive.current) return

      // Le serveur a reconstruit les lignes : relire les nouveaux IDs,
      // les dates et les montants calculés.
      const refreshed = await loadData()

      if (alive.current && refreshed) {
        setStatus('Modèle appliqué et échéancier actualisé')
      }
    } catch (err) {
      if (!alive.current) return

      setError(errorMessage(err))

      const data = err.response?.data

      if (
        !err.response ||
        data?.reloadRequired ||
        data?.partialChangesPossible ||
        err.response?.status >= 500
      ) {
        const refreshed = await loadData()

        if (alive.current && refreshed) {
          setStatus('Données relues. Vérifiez le modèle et les échéances.')
        }
      } else {
        setStatus('Le modèle n’a pas été appliqué.')
      }
    } finally {
      busy.current = false

      if (alive.current) {
        setSaving(false)
      }
    }
  }

  const columns = [
    {
      title: 'Échéance',
      dataIndex: 'date',
      width: 145,
      render: (value, row) => (
        <DatePicker
          size="small"
          variant="borderless"
          format="DD/MM/YYYY"
          value={value}
          allowClear={false}
          disabled={locked || row.regle}
          onChange={(date) => handleChange(row.key, 'date', date)}
          className="w-full"
        />
      )
    },
    {
      title: '% TTC',
      dataIndex: 'pourcent',
      width: 90,
      render: (value, row) => (
        <InputNumber
          size="small"
          variant="borderless"
          controls={false}
          min={0}
          max={100}
          value={value}
          disabled={locked || row.equil}
          onChange={(number) => handleChange(row.key, 'pourcent', number)}
          className="!w-full"
        />
      )
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      width: 145,
      align: 'right',
      render: (value, row) => {
        const calculated = row.equil || row.pourcent > 0

        return (
          <InputNumber
            size="small"
            variant="borderless"
            controls={false}
            step={0.01}
            precision={2}
            value={calculated ? row.montantCalcule : value}
            placeholder={calculated ? 'Calcul Sage…' : 'Montant'}
            disabled={locked || row.equil}
            onChange={(number) => handleChange(row.key, 'montant', number)}
            className="!w-full"
          />
        )
      }
    },
    {
      title: 'Devises',
      dataIndex: 'devises',
      width: 145,
      align: 'right',
      render: (value, row) => {
        const calculated = row.equil || row.pourcent > 0

        return (
          <InputNumber
            size="small"
            variant="borderless"
            controls={false}
            step={0.01}
            precision={2}
            value={calculated ? row.devisesCalcule : value}
            placeholder="—"
            disabled={locked || row.equil || row.pourcent > 0 || !enableDevises}
            onChange={(number) => handleChange(row.key, 'devises', number)}
            className="!w-full"
          />
        )
      }
    },
    {
      title: 'Mode de règlement',
      dataIndex: 'modeReglement',
      width: 195,
      render: (value, row) => {
        const options =
          value && !PAYMENT_OPTIONS.some((option) => option.value === value)
            ? [...PAYMENT_OPTIONS, { value, label: value }]
            : PAYMENT_OPTIONS

        return (
          <Select
            size="small"
            variant="borderless"
            value={value || undefined}
            options={options}
            placeholder="Sélectionner"
            disabled={locked || row.regle}
            onChange={(label) => handleChange(row.key, 'modeReglement', label)}
            className="w-full"
          />
        )
      }
    },
    {
      title: 'État',
      width: 135,
      render: (_, row) => {
        if (row.regle) return <Tag color="green">Réglée</Tag>
        if (row.equil) return <Tag>Équilibrage</Tag>

        return <span>Non réglée</span>
      }
    }
  ]

  if (!documentPiece) {
    return <Alert type="info" message="Sélectionnez un document." />
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Divider orientation="left" plain className="!mb-4 !mt-2">
        Échéancier
      </Divider>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-[13px] text-gray-600">Modèle de règlement</label>

        <Select
          size="small"
          value={model?.value}
          options={model?.options ?? []}
          loading={loading || saving}
          disabled={locked || dirty || !model}
          onChange={handleModelChange}
          showSearch
          optionFilterProp="label"
          placeholder="Sélectionnez un modèle"
          className="w-full sm:!w-[440px]"
        />
      </div>

      {dirty && (
        <div className="mb-2 text-xs text-amber-700">
          Terminez les lignes en cours pour pouvoir changer de modèle.
        </div>
      )}

      {error && <Alert type="error" showIcon message={error} className="!mb-3" />}

      {hasPaidRows && (
        <Alert
          type="info"
          showIcon
          message="Une échéance est réglée : cet échéancier est en lecture seule."
          className="!mb-3"
        />
      )}

      {/* Bouton de récupération uniquement en cas d'échec de lecture. */}
      {!ready && !loading && !saving && (
        <Button
          size="small"
          className="mb-3 self-start"
          onClick={() => {
            setError('')
            void loadData()
          }}
        >
          Réessayer la connexion
        </Button>
      )}

      <div className="mb-2 min-h-5 text-xs text-gray-500" aria-live="polite">
        {status || (loading ? 'Chargement…' : '')}
      </div>

      <div className="mb-4 flex min-h-0 flex-1 flex-col gap-2 md:flex-row">
        <div className="min-w-0 flex-1">
          <Table
            size="small"
            bordered
            rowKey="key"
            loading={loading || saving}
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 950, y: 320 }}
            className="[&_.ant-table-cell]:!px-1 [&_.ant-table-cell]:!py-0.5"
            rowClassName={(row) => `text-[12px] ${row.equil ? 'bg-gray-50' : ''}`}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: setSelectedKeys,
              getCheckboxProps: (row) => ({
                disabled: locked || !canDelete(row)
              })
            }}
          />
        </div>

        <div className="flex shrink-0 gap-2 pt-1 md:w-[110px] md:flex-col">
          <Button size="small" disabled={locked} onClick={handleAdd}>
            Ajouter
          </Button>

          <Button
            size="small"
            danger
            disabled={locked || selectedKeys.length === 0}
            onClick={handleDelete}
          >
            Supprimer
          </Button>
        </div>
      </div>

      <div className="mt-auto shrink-0 py-3">
        <Checkbox disabled className="text-[12px]">
          Autoriser le paiement en ligne
        </Checkbox>

        <Divider orientation="left" plain>
          Récapitulation Net à payer
        </Divider>

        <div className="flex justify-end">
          <div className="w-full rounded-md border border-[#cce0f5] bg-[#eef5fb] p-3 sm:w-[300px]">
            {[
              ['Total TTC', totalTTC],
              ['Acomptes', acomptes],
              ['Net à payer', netAPayer],
              ['Net à payer MAD', netAPayerMAD]
            ].map(([label, value]) => (
              <div key={label} className="mb-1.5 flex justify-between gap-4 text-gray-700">
                <span>{label}</span>
                <span>{formatMoney(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
