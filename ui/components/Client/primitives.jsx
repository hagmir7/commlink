import React from 'react'
import { Divider, Input, Select, Checkbox, InputNumber } from 'antd'

export function Label({ children, disabled }) {
  return (
    <label
      className={`text-right text-[13px] leading-tight ${
        disabled ? 'text-gray-400' : 'text-gray-800'
      }`}
    >
      {children}
    </label>
  )
}

export function Row({
  label,
  value,
  onChange,
  disabled = false,
  bold = false,
  readOnly = false,
  combo = false,
  options = [],
  number = false,
  span = 1,
  autoFocus = false
}) {
  return (
    <>
      <Label disabled={disabled}>{label}</Label>
      <div style={{ gridColumn: `span ${span}` }} className="min-w-0">
        {combo ? (
          <Select
            size="small"
            disabled={disabled}
            value={value ?? undefined}
            onChange={onChange}
            options={options}
            className="w-full"
            style={{ height: 24, fontSize: 13 }}
          />
        ) : number ? (
          <InputNumber
            size="small"
            disabled={disabled}
            readOnly={readOnly}
            value={value}
            onChange={onChange}
            className="w-full"
            style={{ fontSize: 13 }}
          />
        ) : (
          <Input
            size="small"
            disabled={disabled}
            readOnly={readOnly}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            className={bold ? 'font-semibold' : ''}
            autoFocus={autoFocus}
          />
        )}
      </div>
    </>
  )
}

export function BoolRow({ label, checked, onChange, disabled, span = 1 }) {
  return (
    <>
      <Label disabled={disabled}>{label}</Label>
      <div style={{ gridColumn: `span ${span}` }} className="min-w-0 flex items-center">
        <Checkbox
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="text-[13px] text-gray-700"
        >
          {checked ? 'Oui' : 'Non'}
        </Checkbox>
      </div>
    </>
  )
}

export const Grid4 = ({ children }) => (
  <div className="grid grid-cols-[130px_minmax(0,1fr)_150px_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
    {children}
  </div>
)

export const Grid2 = ({ children, label = 120 }) => (
  <div
    className="grid gap-x-3 gap-y-2 items-center"
    style={{ gridTemplateColumns: `${label}px minmax(0,1fr)` }}
  >
    {children}
  </div>
)

export const Panel = ({ children }) => (
  <div className="bg-white border border-solid border-gray-300 px-5 pb-4">{children}</div>
)

export const Section = ({ title }) => <Divider titlePlacement="start">{title}</Divider>

export const Empty = ({ text = 'Non disponible' }) => (
  <p className="m-0 text-sm text-gray-400">{text}</p>
)
