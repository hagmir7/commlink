/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, DatePicker, Input, InputNumber, Select, Spin } from 'antd'
import dayjs from 'dayjs'
import { getClientFreeFields, updateClientFreeFields } from '../../api/client'
import { Empty, Panel, Section } from './primitives'

const TYPES = new Set(['text', 'table', 'number', 'amount', 'date'])
const errorText = (err) => err?.response?.data?.message || err?.message || 'Échec de la requête'
const canEdit = (field) => !field.isCalculable && TYPES.has(field.type)
const validValue = (field, value) => {
  if (!canEdit(field)) return false
  if (field.type === 'number' || field.type === 'amount') {
    return typeof value === 'number' && Number.isFinite(value)
  }
  if (field.type === 'text') return value === null || typeof value === 'string'
  return typeof value === 'string'
}
const readFields = (response) => {
  if (!Array.isArray(response) || response.some((field) => typeof field.name !== 'string')) {
    throw new Error('Réponse des informations libres invalide')
  }
  return response
}
const dateValue = (value) => {
  if (!value) return null
  const date = dayjs(value)
  return date.isValid() && date.year() >= 1900 ? date : null
}

export default function FreeFieldsTab({ code }) {
  const [fields, setFields] = useState([])
  const [changes, setChanges] = useState({})
  const [loading, setLoading] = useState(!!code)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [refreshError, setRefreshError] = useState(null)
  const [reload, setReload] = useState(0)
  const alive = useRef(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    getClientFreeFields(code)
      .then((response) => {
        if (!cancelled) setFields(readFields(response))
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, reload])

  const dirty = Object.keys(changes).length > 0
  const invalid = fields.some(
    (field) => Object.hasOwn(changes, field.name) && !validValue(field, changes[field.name])
  )

  useEffect(() => {
    if (!code || !dirty || invalid || saving || saveError || loading || error) return
    // Build the PATCH only from known, editable fields with actual changes.
    const snapshot = Object.fromEntries(
      fields
        .filter((field) => canEdit(field) && Object.hasOwn(changes, field.name))
        .map((field) => [field.name, changes[field.name]])
    )
    if (!Object.keys(snapshot).length) return
    const timer = setTimeout(async () => {
      setSaving(true)
      try {
        await updateClientFreeFields(code, snapshot)
        if (!alive.current) return
        let updated
        try {
          updated = readFields(await getClientFreeFields(code))
          if (!alive.current) return
          setRefreshError(null)
        } catch (err) {
          if (!alive.current) return
          // The PATCH succeeded. Keep its values even if the refresh fails.
          setRefreshError(errorText(err))
        }
        setFields(
          (prev) =>
            updated ||
            prev.map((field) =>
              Object.hasOwn(snapshot, field.name)
                ? { ...field, value: snapshot[field.name] }
                : field
            )
        )
        setChanges((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(
              ([name, value]) => !Object.hasOwn(snapshot, name) || !Object.is(value, snapshot[name])
            )
          )
        )
      } catch (err) {
        if (alive.current) setSaveError(errorText(err))
      } finally {
        if (alive.current) setSaving(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [changes, code, dirty, error, fields, invalid, loading, saveError, saving])

  const change = (field, value) => {
    if (!canEdit(field)) return
    setSaveError(null)
    setChanges((prev) => {
      const next = { ...prev, [field.name]: value }
      // While saving, keep this edit even if it matches the old server value.
      if (!saving && Object.is(value, field.value)) delete next[field.name]
      return next
    })
  }
  const retryLoad = () => {
    setLoading(true)
    setError(null)
    setRefreshError(null)
    setReload((prev) => prev + 1)
  }

  if (!code)
    return (
      <Panel>
        <Empty text="Enregistrez le client avant de modifier ses champs libres." />
      </Panel>
    )
  if (loading)
    return (
      <Panel>
        <div className="p-6 text-center">
          <Spin />
        </div>
      </Panel>
    )
  if (error)
    return (
      <Panel>
        <Alert
          type="error"
          showIcon
          title={error}
          action={
            <Button size="small" onClick={retryLoad}>
              Réessayer
            </Button>
          }
        />
      </Panel>
    )

  return (
    <Panel>
      <Section title="Informations libres" />
      {!fields.length && <Empty text="Aucune information libre" />}
      <div className="grid grid-cols-[170px_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 pb-2">
        {fields.map((field, index) => {
          const id = 'client-free-field-' + index
          const value = Object.hasOwn(changes, field.name) ? changes[field.name] : field.value
          const disabled = !canEdit(field)
          const common = { id, size: 'small', disabled, className: 'w-full' }
          let input
          switch (field.type) {
            case 'table': {
              const choices = [...new Set([...(field.options || []), ...(value ? [value] : [])])]
              input = (
                <Select
                  {...common}
                  showSearch
                  optionFilterProp="label"
                  placeholder="—"
                  allowClear
                  value={value || undefined}
                  options={choices.map((option) => ({ value: option, label: option }))}
                  onChange={(next) => change(field, next ?? '')}
                />
              )
              break
            }
            case 'number':
            case 'amount':
              input = (
                <InputNumber
                  {...common}
                  style={{ width: '100%' }}
                  decimalSeparator=","
                  value={value ?? null}
                  status={
                    Object.hasOwn(changes, field.name) && !validValue(field, value)
                      ? 'error'
                      : undefined
                  }
                  onChange={(next) => change(field, next)}
                />
              )
              break
            case 'date':
              input = (
                <DatePicker
                  {...common}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  value={dateValue(value)}
                  onChange={(next) => {
                    if (next) change(field, next.format('YYYY-MM-DD'))
                  }}
                />
              )
              break
            default:
              input = (
                <Input
                  {...common}
                  value={value ?? ''}
                  maxLength={field.size || undefined}
                  onChange={(event) => change(field, event.target.value || null)}
                />
              )
          }
          return (
            <div key={field.name} className="contents">
              <label
                htmlFor={id}
                title={field.name}
                className="truncate text-right text-[12px] leading-6 text-gray-800"
              >
                {field.name}
              </label>
              {input}
            </div>
          )
        })}
      </div>
      {invalid && <p className="text-xs text-red-600">Saisissez une valeur numérique valide.</p>}
      {fields.length > 0 && (
        <div className="py-1 text-xs text-gray-500" role="status" aria-live="polite">
          {saving
            ? 'Enregistrement…'
            : dirty
              ? 'Modifications en attente'
              : 'Modifications enregistrées'}
        </div>
      )}
      {saveError && (
        <Alert
          type="error"
          showIcon
          title={saveError}
          description="Les modifications ne sont pas enregistrées."
          action={
            <Button size="small" onClick={() => setSaveError(null)}>
              Réessayer
            </Button>
          }
        />
      )}
      {refreshError && (
        <Alert
          type="warning"
          showIcon
          title="Enregistré, mais actualisation impossible"
          description={refreshError}
          action={
            <Button size="small" disabled={dirty || saving} onClick={retryLoad}>
              Actualiser
            </Button>
          }
        />
      )}
    </Panel>
  )
}
