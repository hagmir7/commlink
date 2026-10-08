import { DatePicker, Input, Select } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { LabeledField, FieldError } from './FormFields'
import { TODAY } from '../utils/dateUtils'
import { DATE_LIVRAISON_STATUT_OPTIONS } from '../constants/documentTypes'

// Focus + open documentTypeSelect (call only when it has no value yet)
const openDocumentType = () =>
  setTimeout(() => {
    const el = document.getElementById('documentTypeSelect')
    if (!el) return
    el.focus()
    el.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      })
    )
  }, 100)

/**
 * @param date          { value, error, disabled, onChange }
 * @param dateLivraison { statutValue, onStatutChange, value, error, onChange }
 * @param representant  { value, options, disabled, onChange }
 * @param nExpedition   { value, onChange }
 * @param typeValue     current value of the document type Select
 */
export default function DateColumn({ date, dateLivraison, representant, nExpedition, typeValue }) {
  const onDateLivraisonChange = (value, dateString) => {
    dateLivraison.onChange?.(value, dateString)
    if (value && !typeValue) openDocumentType()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Date */}
      <LabeledField label="Date" labelWidth={70}>
        <DatePicker
          size="small"
          value={date.value}
          status={date.error ? 'error' : undefined}
          onChange={date.onChange}
          format="DDMMYY"
          disabled={date.disabled}
          className="w-full"
          allowClear={false}
        />
      </LabeledField>
      <FieldError error={date.error} offset={78} />

      {/* Date livraison */}
      <LabeledField label="Date livraison" labelWidth={70}>
        <Select
          size="small"
          value={dateLivraison.statutValue}
          onChange={dateLivraison.onStatutChange}
          className="w-24"
          suffixIcon={<DownOutlined style={{ fontSize: 9 }} />}
          options={DATE_LIVRAISON_STATUT_OPTIONS}
        />
        <DatePicker
          size="small"
          id="dateLivraison"
          value={dateLivraison.value}
          status={dateLivraison.error ? 'error' : undefined}
          onChange={onDateLivraisonChange}
          placeholder="Date livraison"
          format="DDMMYY"
          disabledDate={(current) => current && current.startOf('day').isBefore(TODAY)}
          className="w-full"
          allowClear={false}
        />
      </LabeledField>
      <FieldError error={dateLivraison.error} offset={78} />

      {/* Représentant */}
      <LabeledField label="Représentant" labelWidth={70}>
        <Select
          size="small"
          className="flex-1"
          options={representant.options}
          value={representant.value}
          disabled={representant.disabled}
          onChange={representant.onChange}
        />
      </LabeledField>

      {/* N° Expédition */}
      <LabeledField label="N° Expédition" labelWidth={70}>
        <Input
          size="small"
          className="flex-1"
          value={nExpedition.value}
          onChange={nExpedition.onChange}
        />
      </LabeledField>
    </div>
  )
}
