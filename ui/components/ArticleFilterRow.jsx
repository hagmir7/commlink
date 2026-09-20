import { Button, Input } from 'antd'

/**
 * The row of inputs above the table.
 * - Acts as a quick "add by reference" form: pressing Enter in the
 *   Référence field triggers a lookup (see DocumentLines).
 * - Acts as an edit form: when a table row is selected, its data is
 *   loaded into these inputs so the user can amend it and save.
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
  canDelete,
  onNew,
  onDelete,
  onSave,
  piece
}) {
  return (
    <div className="shrink-0">
      <div
        className="flex items-center bg-white border-b border-gray-200 py-1.5 overflow-x-auto gap-3 justify-between"
        style={{ minWidth: Object.values(widths).reduce((sum, w) => sum + w, 0) }}
      >
        {columnDefs.map(({ key, placeholder }) => {
          if (!key)
            return (
              <div
                key="ttc-placeholder"
                style={{ width: widths[key], flex: `0 0 ${widths[key]}px` }}
              />
            )

          const isReference = key === 'articleRef'
          return (
            <div
              key={key}
              style={{ width: widths[key], flex: `0 0 ${widths[key]}px` }}
              className="px-0.5"
            >
              <Input
                size="small"
                placeholder={placeholder}
                className="w-full"
                value={values[key] ?? ''}
                onChange={(e) => onFieldChange(key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isReference) {
                      onReferenceKeyDown(e)
                    } else {
                      onEnterKeyDown(e)
                    }
                  }
                }}
                loading={isReference ? referenceLoading : undefined}
                disabled={isReference ? referenceLoading || isEditing : !piece}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-end gap-1 ml-2 shrink-0 p-1">
        <Button size="small" onClick={onNew}>
          Nouveau
        </Button>
        <Button size="small" disabled={!canDelete} onClick={onDelete}>
          Supprimer
        </Button>
        <Button size="small" type="primary" disabled={!isEditing} onClick={onSave}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
