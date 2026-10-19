import { useState, useRef, useEffect } from 'react'
import { Input, Select } from 'antd'
import DescriptionPickerModal from './DescriptionPickerModal'

/* ------------------------------------------------------------------ */
/* Safe formula evaluator (no eval)                                    */
/* Supports + - * / ( ) and "," or "." as decimal separator            */
/* ------------------------------------------------------------------ */
function evaluateFormula(input) {
  const src = String(input).replace(/^=/, '').replace(/\s+/g, '').replace(/,/g, '.')

  if (!src || !/^[0-9+\-*/().]+$/.test(src)) return null

  let pos = 0
  const peek = () => src[pos]

  // expr = term (('+' | '-') term)*
  function parseExpr() {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = src[pos++]
      const right = parseTerm()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  // term = factor (('*' | '/') factor)*
  function parseTerm() {
    let value = parseFactor()
    while (peek() === '*' || peek() === '/') {
      const op = src[pos++]
      const right = parseFactor()
      if (op === '/' && right === 0) throw new Error('div0')
      value = op === '*' ? value * right : value / right
    }
    return value
  }

  // factor = number | '(' expr ')' | '-' factor
  function parseFactor() {
    if (peek() === '-') {
      pos++
      return -parseFactor()
    }
    if (peek() === '(') {
      pos++
      const v = parseExpr()
      if (peek() !== ')') throw new Error('paren')
      pos++
      return v
    }
    const m = /^(\d+(\.\d+)?|\.\d+)/.exec(src.slice(pos))
    if (!m) throw new Error('number')
    pos += m[0].length
    return parseFloat(m[0])
  }

  try {
    const result = parseExpr()
    if (pos !== src.length || !Number.isFinite(result)) return null
    return result
  } catch {
    return null
  }
}

/**
 * Resolve a raw input value.
 * - "=..." formula       -> result string, or error if invalid / negative
 * - plain negative number -> error
 * - anything else         -> unchanged
 * Returns { value, changed, error }
 */
function resolveNumeric(raw, decimals = 2) {
  const str = String(raw ?? '').trim()
  if (!str) return { value: '', changed: false, error: false }

  if (str.startsWith('=')) {
    const res = evaluateFormula(str)
    if (res === null || res < 0) {
      return { value: '', changed: true, error: true }
    }
    const rounded = Number(res.toFixed(decimals))
    return { value: String(rounded), changed: true, error: false }
  }

  const plain = Number(str.replace(',', '.'))
  if (!Number.isNaN(plain) && plain < 0) {
    return { value: '', changed: true, error: true }
  }
  return { value: str, changed: false, error: false }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Hide numeric 0 (and null/undefined) in inputs/selects.
// String "0" typed by the user is kept so they can still enter 0, 10, 20, ...
const displayValue = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && v === 0) return ''
  return v
}

// Fields that accept numbers / formulas. Replace with your real column keys
// or pass them through the `numericKeys` prop.
const NUMERIC_KEYS = ['quantite', 'prixUnitaire', 'remise', 'tva', 'prixHT']

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * The row of inputs above the table.
 *
 * Layout rules (must mirror the table):
 * - The row is full-width of its parent, but its children are `shrink-0`
 *   with explicit pixel widths coming from `widths`.
 * - `selectionColumnWidth` reserves the same space as the antd checkbox
 *   column so the first input aligns with the first data column.
 * - No `justify-*` — children stay pinned to the left, matching the table.
 *
 * Bulk mode (`isMultiEdit`): several table lines are selected. Only the
 * fields listed in `bulkKeys` stay enabled; whatever is typed in them is
 * applied to every selected line when the user presses Enter.
 */
export default function ArticleFilterRow({
  columnDefs,
  widths,
  values,
  onFieldChange,
  onReferenceKeyDown,
  onEnterKeyDown,
  referenceLoading,
  isEditing,
  isMultiEdit = false,
  selectedCount = 0,
  bulkKeys = [],
  piece,
  conditionnementOptions = [],
  selectionColumnWidth = 0,
  numericKeys = NUMERIC_KEYS
}) {
  const [descModalOpen, setDescModalOpen] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  // A submit that must run AFTER the parent state holds the computed result
  const pendingSubmit = useRef(null)

  useEffect(() => {
    const p = pendingSubmit.current
    if (!p) return
    if (String(values[p.key] ?? '') === p.value) {
      pendingSubmit.current = null
      const fakeEvent = {
        key: 'Enter',
        preventDefault() {},
        stopPropagation() {},
        target: { value: p.value },
        currentTarget: { value: p.value }
      }
      if (p.isReference) onReferenceKeyDown(fakeEvent)
      else onEnterKeyDown(fakeEvent)
    }
  }, [values]) // eslint-disable-line react-hooks/exhaustive-deps

  // On blur: only resolve the formula, never submit
  const applyNumeric = (key, raw) => {
    const { value, changed, error } = resolveNumeric(raw)
    if (changed) onFieldChange(key, value)
    setErrorKey(error ? key : null)
  }

  const handleEnter = (e, key, isReference, isNumeric) => {
    if (isNumeric) {
      const { value, changed, error } = resolveNumeric(e.currentTarget.value)

      if (error) {
        // negative / invalid: clear the field, do NOT save
        e.preventDefault()
        pendingSubmit.current = null
        onFieldChange(key, '')
        setErrorKey(key)
        return
      }

      if (changed) {
        // formula resolved: write the result, then save automatically
        e.preventDefault()
        setErrorKey(null)
        pendingSubmit.current = { key, value, isReference }
        onFieldChange(key, value)
        return
      }
    }

    if (isReference) onReferenceKeyDown(e)
    else onEnterKeyDown(e)
  }

  return (
    <>
      {/* {isMultiEdit && (
        <div className="border-b border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-900">
          {selectedCount} lignes sélectionnées : renseignez les champs à modifier puis appuyez sur
          Entrée pour les appliquer à toutes les lignes. Les champs vides sont ignorés.
        </div>
      )} */}

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
          const isNumeric = numericKeys.includes(key)

          // In bulk mode only the bulk fields are editable.
          const bulkLocked = isMultiEdit && !bulkKeys.includes(key)

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
                  disabled={!piece || conditionnementOptions.length === 0 || isMultiEdit}
                  notFoundContent="Aucun"
                />
              ) : (
                <Input
                  size="small"
                  placeholder={placeholder}
                  id={isReference ? 'referenc' : ''}
                  className="w-full"
                  status={errorKey === key ? 'error' : undefined}
                  value={displayValue(values[key])}
                  onChange={(e) => {
                    pendingSubmit.current = null
                    if (errorKey === key) setErrorKey(null)
                    onFieldChange(key, e.target.value)
                  }}
                  onBlur={(e) => {
                    if (isNumeric) applyNumeric(key, e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEnter(e, key, isReference, isNumeric)
                    }
                    if (e.key === 'F4' && key === 'description') {
                      e.preventDefault()
                      setDescModalOpen(true)
                    }
                  }}
                  loading={isReference ? referenceLoading : undefined}
                  disabled={
                    isReference
                      ? referenceLoading || isEditing || isMultiEdit
                      : !piece || bulkLocked
                  }
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
