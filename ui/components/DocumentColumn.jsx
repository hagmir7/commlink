import { Button, Input, Select } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { LabeledField, FieldError } from './FormFields'
import { SOUCHE_OPTIONS, TYPE_OPTIONS } from '../constants/documentTypes'

/**
 * @param souche     { value, error, disabled, onChange }
 * @param numero     string (read-only document number)
 * @param reference  { value, error, onChange }
 * @param type       { value, error, onChange }
 * @param port       { value, onChange }
 * @param submitting boolean
 * @param onValidate () => void
 */
export default function DocumentColumn({
  souche,
  numero,
  reference,
  type,
  port,
  submitting,
  onValidate
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* N° document */}
      <LabeledField label="N° document" labelWidth={80}>
        <Select
          size="small"
          value={souche.value}
          status={souche.error ? 'error' : undefined}
          onChange={souche.onChange}
          className="w-28"
          disabled={souche.disabled}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          options={SOUCHE_OPTIONS}
        />

        <Input size="small" disabled value={numero} className="flex-1" />
      </LabeledField>

      <FieldError error={souche.error} offset={88} />

      {/* Référence */}
      <LabeledField label="Référence" labelWidth={80}>
        <Input
          size="small"
          status={reference.error ? 'error' : undefined}
          value={reference.value}
          onChange={reference.onChange}
          className="flex-1"
        />
      </LabeledField>

      <FieldError error={reference.error} offset={88} />

      {/* Type */}
      <LabeledField label="Type" labelWidth={80}>
        <Select
          size="small"
          className="w-full"
          status={type.error ? 'error' : undefined}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          value={type.value}
          onChange={type.onChange}
          options={TYPE_OPTIONS}
        />
      </LabeledField>

      <FieldError error={type.error} offset={88} />

      {/* Port */}
      <LabeledField label="Port" labelWidth={80}>
        <Input
          size="small"
          className="flex-1"
          value={port.value}
          onChange={port.onChange}
          onPressEnter={onValidate}
          disabled={submitting}
        />

        <Button
          size="small"
          type="primary"
          ghost
          className="!border-blue-400 !text-blue-600"
          onClick={onValidate}
          loading={submitting}
        >
          Valider
        </Button>
      </LabeledField>
    </div>
  )
}
