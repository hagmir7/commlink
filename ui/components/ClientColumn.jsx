import { useEffect, useRef } from 'react'
import { Select } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { LabeledField, FieldError } from './FormFields'

const norm = (s = '') => {
  const v = s.trim().toUpperCase()
  return !v || v.startsWith('CL') ? v : `CL${v}`
}
const code = (o) => `${o?.value ?? ''}`.toUpperCase().trim()

const focusDateLivraison = () =>
  setTimeout(() => {
    const el = document.getElementById('dateLivraison')
    el.click()
  }, 10)

const S = ({ f, ...props }) => (
  <Select
    size="small"
    className="flex-1"
    status={f?.fieldError || f?.error ? 'error' : undefined}
    suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
    {...props}
  />
)

export default function ClientColumn({ client, statut, affaire, expedition }) {
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const onChange = (value, option) => {
    client.onChange?.(value, option)
    focusDateLivraison()
  }

  const selectByCode = (typed) => {
    const c = norm(typed)
    const match = c && (client.options ?? []).find((o) => code(o) === c)
    if (!match) return false
    onChange(match.value, match)
    return true
  }

  const onSearch = (text) => {
    clearTimeout(timer.current)
    if (/^\d+$/.test(text.trim())) timer.current = setTimeout(() => selectByCode(text), 300)
  }

  const onEnter = (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return
    clearTimeout(timer.current)
    if (selectByCode(e.target.value)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <LabeledField label="Client">
        <span className="text-[12px] text-blue-700 underline w-14 shrink-0">Numéro</span>
        <div className="flex-1 min-w-0" onKeyDownCapture={onEnter}>
          <S
            f={client}
            className="w-full"
            autoFocus
            showSearch
            options={client.options}
            value={client.value}
            loading={client.loading}
            disabled={client.disabled}
            onChange={onChange}
            onSearch={onSearch}
            filterOption={(input, o) => {
              const t = input.trim().toUpperCase()
              return (
                !t || code(o).startsWith(norm(t)) || `${o?.label ?? ''}`.toUpperCase().includes(t)
              )
            }}
            filterSort={(a, b, { searchValue }) =>
              (code(b) === norm(searchValue)) - (code(a) === norm(searchValue))
            }
          />
        </div>
      </LabeledField>
      <FieldError error={client.fieldError || client.error} />

      <LabeledField label="Statut">
        <S
          f={statut}
          className="w-54"
          value={statut.value}
          options={statut.options}
          onChange={statut.onChange}
        />
        <Select size="small" disabled className="flex-1" />
      </LabeledField>
      <FieldError error={statut.error} />

      <LabeledField label="Affaire">
        <Select size="small" className="flex-1" value={affaire.value} onChange={affaire.onChange} />
      </LabeledField>

      <LabeledField label="Expédition">
        <S
          f={expedition}
          options={expedition.options}
          value={expedition.value}
          loading={expedition.loading}
          onChange={expedition.onChange}
        />
      </LabeledField>
      <FieldError error={expedition.fieldError || expedition.error} />
    </div>
  )
}
