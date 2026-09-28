import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, DatePicker, Empty, Input, InputNumber, Select, Spin, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../utils/api'
import DesktopWindow from './ui/DesktopWindow'
import { Livraison, Messagerie, NatureMarchandises, TYPE_OPTIONS } from '../constants/documentTypes'

const normalizeKey = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()

const INFO_LIBRE_OPTIONS = {
  livraison: Livraison,
  naturedemarchandises: NatureMarchandises,
  naturemarchandises: NatureMarchandises,
  type: TYPE_OPTIONS,
  messagerie: Messagerie
}

// Resolve the option list for a "table" field from its comment (fallback: name)
const getOptionsForField = (field) => {
  if (!field || field.type !== 'table') return null
  const key = normalizeKey(field.comment || field.name)
  return INFO_LIBRE_OPTIONS[key] ?? null
}

/* ------------------------------------------------------------------ */
/*  Normalizers                                                        */
/* ------------------------------------------------------------------ */

const normalizeDate = (value) => {
  if (!value) return null
  const date = dayjs(value)
  return date.isValid() && date.year() >= 1900 ? date.format('YYYY-MM-DD') : null
}

const normalizeValue = ({ type, value }) => {
  switch (type) {
    case 'date':
      return normalizeDate(value)
    case 'number':
    case 'amount':
      return value ?? 0
    default:
      return value ?? ''
  }
}

/* ------------------------------------------------------------------ */
/*  FieldInput                                                         */
/* ------------------------------------------------------------------ */

function FieldInput({ field, value, onChange }) {
  const disabled = field.isCalculable

  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          size="small"
          className="w-full"
          min={0}
          precision={0}
          disabled={disabled}
          style={{ width: '100%' }}
          value={value}
          onChange={(v) => onChange(v ?? 0)}
        />
      )

    case 'amount':
      return (
        <InputNumber
          size="small"
          className="w-full"
          precision={2}
          style={{ width: '100%' }}
          decimalSeparator=","
          disabled={disabled}
          value={value}
          onChange={(v) => onChange(v ?? 0)}
        />
      )

    case 'date':
      return (
        <DatePicker
          size="small"
          className="w-full"
          format="DD/MM/YYYY"
          disabled={disabled}
          value={value ? dayjs(value) : null}
          onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : null)}
        />
      )

    case 'table': {
      const options = getOptionsForField(field)

      // No mapping found -> fall back to plain text
      if (!options) {
        return (
          <Input
            size="small"
            maxLength={field.size || undefined}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }

      // Make sure an unknown stored value stays visible in the dropdown
      const safeOptions =
        value && !options.some((o) => o.value === value)
          ? [...options, { value, label: value }]
          : options

      return (
        <Select
          size="small"
          style={{ width: '100%' }}
          disabled={disabled}
          value={value || undefined}
          placeholder="—"
          allowClear
          showSearch
          optionFilterProp="label"
          options={safeOptions}
          onChange={(v) => onChange(v ?? '')}
        />
      )
    }

    default: // 'text'
      return (
        <Input
          size="small"
          maxLength={field.size || undefined}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

/* ------------------------------------------------------------------ */
/*  DocumentInfoList                                                   */
/* ------------------------------------------------------------------ */

export default function DocumentInfoList({ open, onClose, docType, docNumber }) {
  const [fields, setFields] = useState([])
  const [original, setOriginal] = useState({}) // values as loaded from the server
  const [values, setValues] = useState({}) // values as currently edited
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const url = `/documents/${docType}/${docNumber}/info-libre`

  const fetchInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(url)
      const list = Array.isArray(data) ? data : []
      const initial = Object.fromEntries(list.map((f) => [f.name, normalizeValue(f)]))
      setFields(list)
      setOriginal(initial)
      setValues(initial)
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || 'Impossible de charger les informations.'
      )
    } finally {
      setLoading(false)
    }
  }, [url])

  // Fetch each time the window opens so the data is always fresh.
  useEffect(() => {
    if (open) fetchInfo()
  }, [open, fetchInfo])

  // Only the fields the user actually changed
  const changes = useMemo(
    () => Object.fromEntries(Object.entries(values).filter(([name, v]) => v !== original[name])),
    [values, original]
  )
  const changeCount = Object.keys(changes).length

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(url, changes)
      message.success('Informations enregistrées')
      await fetchInfo()
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || "Échec de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DesktopWindow
      open={open}
      onClose={onClose}
      width={520}
      bodyClassName="px-4 py-3"
      title={`Info libre — ${docNumber}`}
    >
      {loading && (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      )}

      {!loading && error && (
        <Alert
          type="error"
          showIcon
          title={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchInfo}>
              Réessayer
            </Button>
          }
        />
      )}

      {!loading && !error && fields.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune information libre" />
      )}

      {!loading && !error && fields.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {fields.map((field) => {
              const wide = field.type === 'text' && field.size > 30
              const dirty = values[field.name] !== original[field.name]
              return (
                <div key={field.name} className={wide ? 'col-span-2 w-full' : 'w-full'}>
                  <label className="mb-0.5 flex items-center gap-1 text-[13px] font-medium text-[#5F7052]">
                    {field.name}
                    {dirty && <span className="h-1.5 w-1.5 rounded-full bg-[#93A47C]" />}
                  </label>
                  <FieldInput
                    field={field}
                    value={values[field.name]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
                  />
                </div>
              )
            })}
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 -mx-4 -mb-3 mt-3 flex items-center justify-between py-2">
            <span className="text-[12px]">
              {changeCount > 0
                ? `${changeCount} modification${changeCount > 1 ? 's' : ''}`
                : 'Aucune modification'}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="small"
                disabled={changeCount === 0 || saving}
                onClick={() => setValues(original)}
              >
                Annuler
              </Button>
              <Button
                size="small"
                type="primary"
                disabled={changeCount === 0}
                loading={saving}
                onClick={handleSave}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </>
      )}
    </DesktopWindow>
  )
}
