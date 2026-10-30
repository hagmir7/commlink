import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  InputNumber,
  Row,
  Select,
  Table,
  Tag
} from 'antd'
import dayjs from 'dayjs'
import { api } from '../utils/api'

const REGLEMENT_LABELS = {
  1: 'Espéce',
  2: 'Chéque',
  3: 'Virement',
  4: 'Vérsement',
  5: 'Carte Bancaire',
  6: 'Lettre de Change'
}

const REGLEMENT_OPTIONS = Object.values(REGLEMENT_LABELS).map((label) => ({
  value: label,
  label
}))

const getField = (item, name) => item[name] ?? item[name.charAt(0).toUpperCase() + name.slice(1)]

const isTrue = (value) => value === true || value === 1 || value === '1'

const formatMoney = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'

  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const getErrorMessage = (error) => {
  const data = error.response?.data

  if (typeof data === 'string') return data
  if (data?.errors) return Object.values(data.errors).flat().join(' ')

  return data?.message || data?.detail || data?.title || error.message || 'Une erreur est survenue.'
}

function mapRows(data) {
  if (!Array.isArray(data)) {
    throw new Error("Réponse de l'échéancier invalide.")
  }

  const ids = new Set()

  return data.map((item) => {
    const no = Number(getField(item, 'no'))

    if (!Number.isSafeInteger(no) || no <= 0 || ids.has(no)) {
      throw new Error("Identifiant d'échéance invalide.")
    }

    ids.add(no)

    const date = getField(item, 'date')

    return {
      key: `existing-${no}`,
      no,
      date: date && dayjs(date).isValid() ? dayjs(date) : null,
      pourcent: Number(getField(item, 'pourcent') ?? 0),
      montant: Number(getField(item, 'montant') ?? 0),
      devises: getField(item, 'devises') ?? null,
      modeReglement:
        getField(item, 'modeReglement') ||
        REGLEMENT_LABELS[Number(getField(item, 'reglement'))] ||
        null,
      equil: isTrue(getField(item, 'equil')),
      regle: isTrue(getField(item, 'regle'))
    }
  })
}

function editablePayload(rows) {
  return rows
    .filter((row) => !row.equil)
    .map((row, index) => {
      const prefix = `Ligne ${index + 1} : `

      if (!row.date?.isValid()) {
        throw new Error(prefix + 'renseignez une date.')
      }

      const pourcent = Number(row.pourcent ?? 0)

      if (!Number.isFinite(pourcent) || pourcent < 0 || pourcent > 100) {
        throw new Error(prefix + 'le pourcentage doit être entre 0 et 100.')
      }

      if (row.no == null && !row.modeReglement) {
        throw new Error(prefix + 'sélectionnez un mode de règlement.')
      }

      const percentageMode = pourcent > 0

      if (!percentageMode && (row.montant == null || !Number.isFinite(Number(row.montant)))) {
        throw new Error(prefix + 'renseignez un montant.')
      }

      if (!percentageMode && row.devises != null && !Number.isFinite(Number(row.devises))) {
        throw new Error(prefix + 'le montant en devises est invalide.')
      }

      return {
        no: row.no ?? null,
        date: row.date.format('YYYY-MM-DD'),
        pourcent: percentageMode ? pourcent : 0,
        montant: percentageMode ? null : Number(row.montant),
        devises: percentageMode || row.devises == null ? null : Number(row.devises),
        modeReglement: row.modeReglement || null
      }
    })
}

const balancePayload = (row) => ({
  date: row.date?.format('YYYY-MM-DD') ?? null,
  modeReglement: row.modeReglement || null
})

function assertSuccess(response) {
  if (response.data?.success !== true) {
    const error = new Error(response.data?.message || "L'enregistrement a échoué.")
    error.response = response
    throw error
  }
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
  enableDevises = false
}) {
  const [rows, setRows] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const alive = useRef(false)
  const busy = useRef(false)
  const rowsRef = useRef([])
  const baseline = useRef([])
  const firstKey = useRef(null)
  const newId = useRef(0)
  const saveTimer = useRef(null)
  const reloadTimer = useRef(null)
  const loadSequence = useRef(0)
  const saveRef = useRef(null)

  const endpoint = `documents/${encodeURIComponent(documentPiece || '')}/echeancier`

  const replaceRows = useCallback((next) => {
    rowsRef.current = next
    setRows(next)
  }, [])

  // Automatic GET retries only. Failed writes are never blindly retried.
  const loadRows = useCallback(
    async function loadRows() {
      if (!documentPiece || !alive.current) return false

      clearTimeout(reloadTimer.current)

      const sequence = ++loadSequence.current
      setLoading(true)
      setReady(false)

      try {
        const response = await api.get(`documents/${encodeURIComponent(documentPiece)}/echeancier`)

        const next = mapRows(response.data)

        if (!alive.current || sequence !== loadSequence.current) {
          return false
        }

        // Preserve the originally protected row even if its date changes
        // and the server returns a different sort order.
        if (!next.some((row) => row.key === firstKey.current)) {
          firstKey.current = next[0]?.key ?? null
        }

        baseline.current = next
        replaceRows(next)
        setSelectedKeys([])
        setDirty(false)
        setReady(true)

        return true
      } catch (err) {
        if (alive.current && sequence === loadSequence.current) {
          setError(getErrorMessage(err))
          setStatus('Connexion indisponible — nouvelle lecture automatique…')

          reloadTimer.current = setTimeout(() => {
            void loadRows()
          }, 5000)
        }

        return false
      } finally {
        if (alive.current && sequence === loadSequence.current) {
          setLoading(false)
        }
      }
    },
    [documentPiece, replaceRows]
  )

  useEffect(() => {
    alive.current = true
    void loadRows()

    return () => {
      alive.current = false
      loadSequence.current += 1
      clearTimeout(saveTimer.current)
      clearTimeout(reloadTimer.current)
    }
  }, [loadRows])

  useEffect(() => {
    if (!dirty && !saving) return undefined

    const preventUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [dirty, saving])

  const hasPaidRows = rows.some((row) => row.regle)
  const locked = readOnly || hasPaidRows || !ready || loading || saving

  const commitLocal = (next) => {
    replaceRows(next)
    setDirty(true)
    setError('')
    setStatus('Modification en attente…')

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveRef.current?.()
    }, 900)
  }

  const handleChange = (key, field, value) => {
    if (locked || busy.current) return

    const target = rowsRef.current.find((row) => row.key === key)

    if (!target || target.regle) return

    // Sage owns the balancing amount and percentage.
    if (
      target.equil &&
      (target.key !== firstKey.current || !['date', 'modeReglement'].includes(field))
    ) {
      return
    }

    const next = rowsRef.current.map((row) => {
      if (row.key !== key) return row

      const updated = { ...row, [field]: value }

      if (field === 'pourcent' && Number(value) > 0) {
        updated.montant = 0
        updated.devises = null
      }

      if (field === 'montant' || field === 'devises') {
        updated.pourcent = 0
      }

      return updated
    })

    commitLocal(next)
  }

  const handleAdd = () => {
    if (locked || busy.current) return

    const row = {
      key: `new-${++newId.current}`,
      no: null,
      date: dayjs(),
      pourcent: 0,
      montant: null,
      devises: null,
      modeReglement: null,
      equil: false,
      regle: false
    }

    if (!firstKey.current) firstKey.current = row.key

    commitLocal([...rowsRef.current, row])
  }

  const handleDelete = () => {
    if (locked || busy.current) return

    const selected = new Set(selectedKeys)

    const next = rowsRef.current.filter(
      (row) => row.key === firstKey.current || row.equil || row.regle || !selected.has(row.key)
    )

    if (next.length === rowsRef.current.length) return

    setSelectedKeys([])
    commitLocal(next)
  }

  const saveAutomatically = async () => {
    if (busy.current || !alive.current || !ready || readOnly) return
    if (rowsRef.current.some((row) => row.regle)) return

    const current = rowsRef.current
    const original = baseline.current

    let payload
    let previousPayload
    let balanceChanges

    try {
      // An incomplete new row stays local until it becomes valid.
      payload = editablePayload(current)
      previousPayload = editablePayload(original)

      balanceChanges = current
        .filter((row) => row.equil)
        .filter((row) => {
          const old = original.find((item) => item.no === row.no)
          return old && JSON.stringify(balancePayload(row)) !== JSON.stringify(balancePayload(old))
        })

      for (const row of balanceChanges) {
        if (!row.date?.isValid()) {
          throw new Error("Renseignez la date de la ligne d'équilibrage.")
        }
      }
    } catch (err) {
      setStatus(err.message)
      return
    }

    const scheduleChanged = JSON.stringify(payload) !== JSON.stringify(previousPayload)

    if (!scheduleChanged && balanceChanges.length === 0) {
      setDirty(false)
      setStatus('À jour')
      return
    }

    busy.current = true
    setSaving(true)
    setStatus('Enregistrement…')
    setError('')

    const params = documentType == null ? {} : { type: documentType }

    let completedWrites = 0

    try {
      // Only date/payment method for the protected balancing row.
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

      setStatus('Actualisation…')

      const refreshed = await loadRows()

      if (alive.current && refreshed) {
        setStatus('Enregistré automatiquement')
      }
    } catch (err) {
      if (!alive.current) return

      const data = err.response?.data
      const uncertain =
        completedWrites > 0 ||
        !err.response ||
        data?.reloadRequired ||
        data?.partialChangesPossible ||
        err.response?.status >= 500

      setError(getErrorMessage(err))

      if (uncertain) {
        // Reconcile actual server state instead of creating duplicate rows
        // by retrying a request with No = null.
        setStatus('Vérification automatique des données enregistrées…')

        const refreshed = await loadRows()

        if (alive.current && refreshed) {
          setStatus('Données relues. Vérifiez les modifications restantes.')
        }
      } else {
        setStatus('Non enregistré : corrigez la valeur pour réessayer.')
      }
    } finally {
      busy.current = false
      if (alive.current) setSaving(false)
    }
  }

  saveRef.current = saveAutomatically

  const canEditDateAndMode = (row) =>
    !locked && !row.regle && (!row.equil || row.key === firstKey.current)

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
          disabled={!canEditDateAndMode(row)}
          onChange={(date) => handleChange(row.key, 'date', date)}
          className="w-full"
        />
      )
    },
    {
      title: '% TTC',
      dataIndex: 'pourcent',
      width: 90,
      align: 'right',
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
      render: (value, row) => (
        <InputNumber
          size="small"
          variant="borderless"
          controls={false}
          step={0.01}
          precision={2}
          value={row.pourcent > 0 && !row.equil ? null : value}
          placeholder={row.pourcent > 0 ? 'Calculé par Sage' : 'Montant'}
          disabled={locked || row.equil}
          onChange={(number) => handleChange(row.key, 'montant', number)}
          className="!w-full"
        />
      )
    },
    {
      title: 'Devises',
      dataIndex: 'devises',
      width: 125,
      align: 'right',
      render: (value, row) => (
        <InputNumber
          size="small"
          variant="borderless"
          controls={false}
          step={0.01}
          precision={2}
          value={value}
          placeholder="—"
          disabled={locked || row.equil || !enableDevises}
          onChange={(number) => handleChange(row.key, 'devises', number)}
          className="!w-full"
        />
      )
    },
    {
      title: 'Mode de règlement',
      dataIndex: 'modeReglement',
      width: 190,
      render: (value, row) => {
        const options =
          value && !REGLEMENT_OPTIONS.some((option) => option.value === value)
            ? [...REGLEMENT_OPTIONS, { value, label: value }]
            : REGLEMENT_OPTIONS

        return (
          <Select
            size="small"
            variant="borderless"
            value={value || undefined}
            placeholder="Sélectionner"
            options={options}
            disabled={!canEditDateAndMode(row)}
            onChange={(label) => handleChange(row.key, 'modeReglement', label)}
            className="w-full"
          />
        )
      }
    },
    {
      title: 'État',
      width: 135,
      render: (_, row) =>
        row.equil ? (
          <Tag>Équilibrage</Tag>
        ) : row.regle ? (
          <Tag color="green">Réglée</Tag>
        ) : (
          <span>Non réglée</span>
        )
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

      <Row gutter={8} className="mb-4 items-center pb-3">
        <Col span={5} className="text-right text-[13px] text-gray-600">
          Modèle de règlement
        </Col>
        <Col span={10}>
          <Select
            size="small"
            disabled
            placeholder="Gestion du modèle dans Sage"
            className="w-full"
          />
        </Col>
      </Row>

      {error && <Alert type="error" showIcon message={error} className="!mb-3" />}

      {hasPaidRows && (
        <Alert
          type="info"
          showIcon
          message="Une échéance est réglée : cet échéancier est en lecture seule."
          className="!mb-3"
        />
      )}

      <div className="mb-2 min-h-5 text-xs text-gray-500" aria-live="polite">
        {status}
      </div>

      <div className="mb-4 flex min-h-0 flex-1 gap-2">
        <div className="min-w-0 flex-1">
          <Table
            size="small"
            bordered
            rowKey="key"
            loading={loading || saving}
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 930, y: 320 }}
            className="[&_.ant-table-cell]:!px-1 [&_.ant-table-cell]:!py-0.5"
            rowClassName={(row) => `text-[12px] ${row.equil ? 'bg-gray-50' : ''}`}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: setSelectedKeys,
              getCheckboxProps: (row) => ({
                disabled: locked || row.equil || row.regle || row.key === firstKey.current
              })
            }}
          />
        </div>

        <div className="flex w-[110px] shrink-0 flex-col gap-2 pt-1">
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
          <div className="w-[300px] rounded-md border border-[#cce0f5] bg-[#eef5fb] p-3">
            {[
              ['Total TTC', totalTTC],
              ['Acomptes', acomptes],
              ['Net à payer', netAPayer],
              ['Net à payer MAD', netAPayerMAD]
            ].map(([label, value]) => (
              <div key={label} className="mb-1.5 flex justify-between text-gray-700">
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
