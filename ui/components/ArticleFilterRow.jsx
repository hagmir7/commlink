import { useState } from 'react'
import { Input, Select } from 'antd'
import DescriptionPickerModal from './DescriptionPickerModal'

/**
 * The row of inputs above the table.
 *
 * Layout rules (must mirror the table):
 * - The row is full-width of its parent, but its children are `shrink-0`
 *   with explicit pixel widths coming from `widths`.
 * - `selectionColumnWidth` reserves the same space as the antd checkbox
 *   column so the first input aligns with the first data column.
 * - No `justify-*` — children stay pinned to the left, matching the table.
 */

// Hide numeric 0 (and null/undefined) in inputs/selects.
// String "0" typed by the user is kept so they can still enter 0, 10, 20, ...
const displayValue = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && v === 0) return ''
  return v
}

export default function ArticleFilterRow({
  columnDefs,
  widths,
  values,
  onFieldChange,
  onReferenceKeyDown,
  onEnterKeyDown,
  referenceLoading,
  isEditing,
  piece,
  conditionnementOptions = [],
  selectionColumnWidth = 0
}) {
  const [descModalOpen, setDescModalOpen] = useState(false)

  return (
    <>
      <div className="flex w-full items-center border-b border-gray-200 bg-white py-1.5">
        {selectionColumnWidth > 0 && (
          <div
            className="shrink-0"
            style={{ width: selectionColumnWidth, flexBasis: selectionColumnWidth }}
          />
        )}

        {columnDefs.map(({ key, placeholder }) => {
          const colWidth = widths[key]

          // Placeholder for the computed P.U. TTC column (no input).
          if (!key) {
            return (
              <div
                key="ttc-placeholder"
                className="shrink-0"
                style={{ width: colWidth, flexBasis: colWidth }}
              />
            )
          }

          const isReference = key === 'articleRef'
          const isConditionnement = key === 'conditionnement'

          return (
            <div
              key={key}
              className="shrink-0 px-0.5"
              style={{ width: colWidth, flexBasis: colWidth }}
            >
              {isConditionnement ? (
                <Select
                  size="small"
                  className="w-full"
                  placeholder={placeholder}
                  value={displayValue(values.conditionnement) || undefined}
                  onChange={(v) => onFieldChange('conditionnement', v ?? '')}
                  options={conditionnementOptions}
                  allowClear
                  disabled={!piece || conditionnementOptions.length === 0}
                  notFoundContent="Aucun"
                />
              ) : (
                <Input
                  size="small"
                  placeholder={placeholder}
                  className="w-full"
                  value={displayValue(values[key])}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (isReference) {
                        onReferenceKeyDown(e)
                      } else {
                        onEnterKeyDown(e)
                      }
                    }
                    if (e.key === 'F4' && key === 'description') {
                      e.preventDefault()
                      setDescModalOpen(true)
                    }
                  }}
                  loading={isReference ? referenceLoading : undefined}
                  disabled={isReference ? referenceLoading || isEditing : !piece}
                />
              )}
            </div>
          )
        })}
      </div>

      <DescriptionPickerModal
        open={descModalOpen}
        onClose={() => setDescModalOpen(false)}
        onSelect={(intitule) => onFieldChange('description', intitule)}
      />
    </>
  )
}
