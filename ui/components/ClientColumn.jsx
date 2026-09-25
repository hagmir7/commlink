import { Select } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { LabeledField, FieldError } from './FormFields'

/**
 * @param client     { value, options, loading, error, fieldError, disabled, onChange }
 * @param statut     { value, options, error, onChange }  -- value is the primitive statut value
 * @param affaire    { value, onChange }
 * @param expedition { value, options, loading, error, fieldError, onChange }
 */
export default function ClientColumn({ client, statut, affaire, expedition }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Client */}
      <LabeledField label="Client">
        <span className="text-[12px] text-blue-700 underline w-14 shrink-0">Numéro</span>

        <Select
          size="small"
          className="flex-1 max-w-full"
          status={client.fieldError ? 'error' : undefined}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          options={client.options}
          value={client.value}
          loading={client.loading}
          disabled={client.disabled}
          onChange={client.onChange}
          showSearch={{
            optionFilterProp: 'label',
            filterOption: (input, option) =>
              option?.label?.toLowerCase().includes(input.toLowerCase())
          }}
        />
      </LabeledField>

      <FieldError error={client.fieldError || client.error} />

      {/* Statut */}
      <LabeledField label="Statut">
        <Select
          size="small"
          className="w-54"
          status={statut.error ? 'error' : undefined}
          value={statut.value}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          options={statut.options.map((item) => ({ value: item.value, label: item.label }))}
          onChange={statut.onChange}
        />

        <Select size="small" disabled className="flex-1" />
      </LabeledField>

      <FieldError error={statut.error} />

      {/* Affaire */}
      <LabeledField label="Affaire">
        <Select size="small" className="flex-1" value={affaire.value} onChange={affaire.onChange} />
      </LabeledField>

      {/* Expédition */}
      <LabeledField label="Expédition">
        <Select
          size="small"
          className="flex-1"
          status={expedition.fieldError ? 'error' : undefined}
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
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
