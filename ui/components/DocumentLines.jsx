import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  HolderOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Button, Checkbox, Empty, Popover, Table, message } from 'antd'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { findArticleByReference } from '../api/article'
import useLineItems from '../hooks/useLineItems'
import ArticleFilterRow from './ArticleFilterRow'
import ArticleSearchModal from './ArticleSearchModal'
import ColumnResizeHandle from './ColumnResizeHandle'
import { api } from '../utils/api'

const renderCell = (value) => {
  if (value === 0 || value === '' || value === null || value === undefined) {
    return ''
  }
  return value
}

const COLUMN_DEFS = [
  { key: 'articleRef', title: 'Référence', defaultWidth: 100, placeholder: 'Référence' },
  { key: 'designation', title: 'Désignation', defaultWidth: 500, placeholder: 'Désignation' },
  {
    key: 'hauteur',
    title: 'Hauteur',
    defaultWidth: 100,
    placeholder: 'Hauteur',
    render: renderCell
  },
  {
    key: 'largeur',
    title: 'Largeur',
    defaultWidth: 100,
    placeholder: 'Largeur',
    render: renderCell
  },
  { key: 'chant', title: 'Chant', defaultWidth: 80, placeholder: 'Chant' },
  { key: 'couleur', title: 'Couleur', defaultWidth: 100, placeholder: 'Couleur' },
  { key: 'prixUnitaire', title: 'P.U. HT', defaultWidth: 100, placeholder: 'P.U. HT' },
  { key: '', title: 'P.U. TTC', defaultWidth: 100, placeholder: 'P.U. TTC' },
  { key: 'quantite', title: 'Quantité', defaultWidth: 80, placeholder: 'Quantité' },
  { key: 'quantityColisee', title: 'Qté colisée', defaultWidth: 100, placeholder: 'Qté colisée' },
  {
    key: 'conditionnement',
    title: 'Conditionnement',
    defaultWidth: 150,
    placeholder: 'Conditionnement'
  },
  { key: 'remise', title: 'Remise', defaultWidth: 60, placeholder: 'Remise' },
  { key: 'description', title: 'Description', defaultWidth: 200, placeholder: 'Description' },
  { key: 'profondeur', title: 'Profondeur', defaultWidth: 100, placeholder: 'Profondeur' },
  { key: 'nom', title: 'Nom', defaultWidth: 100, placeholder: 'Nom' },
  { key: 'episseur', title: 'Episseur', defaultWidth: 100, placeholder: 'Episseur' }
]

const MIN_COLUMN_WIDTH = 50
const VAT_RATE = 1.2

/** No checkbox column anymore (selection = click / ctrl+click / shift+click). */
const SELECTION_COLUMN_WIDTH = 0

/* ------------------------------------------------------------------ */
/* Column customization (order + visibility)                           */
/* ------------------------------------------------------------------ */

/** The TTC column has an empty key, so we use a stable id for it. */
const colId = (col) => col.key || 'prixUnitaireTTC'

/** Columns that cannot be hidden (the reference input is how lines get added). */
const LOCKED_COLUMNS = new Set(['articleRef'])

const COLUMN_DEFS_BY_ID = Object.fromEntries(COLUMN_DEFS.map((c) => [colId(c), c]))

const DEFAULT_COLUMN_STATE = COLUMN_DEFS.map((c) => ({ id: colId(c), visible: true }))

const columnStorageKey = (documentType) => `documentLines.columns.${documentType}`

/**
 * Loads the saved layout and reconciles it with COLUMN_DEFS:
 * unknown ids are dropped, new columns are appended at the end.
 */
const loadColumnState = (documentType) => {
  try {
    const raw = window.localStorage.getItem(columnStorageKey(documentType))
    if (!raw) return DEFAULT_COLUMN_STATE
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved)) return DEFAULT_COLUMN_STATE

    const known = saved.filter((s) => s && COLUMN_DEFS_BY_ID[s.id])
    const seen = new Set(known.map((s) => s.id))
    const missing = DEFAULT_COLUMN_STATE.filter((s) => !seen.has(s.id))
    return [...known, ...missing].map((s) => ({
      id: s.id,
      visible: LOCKED_COLUMNS.has(s.id) ? true : s.visible !== false
    }))
  } catch {
    return DEFAULT_COLUMN_STATE
  }
}

function ColumnSettings({ columnState, onToggle, onMove, onReset }) {
  const dragIndexRef = useRef(null)
  const [overIndex, setOverIndex] = useState(null)

  const content = (
    <div className="w-60">
      <div className="mb-1 text-xs text-gray-500">
        Glissez ou utilisez les flèches pour réordonner.
      </div>
      <div className="max-h-80 overflow-y-auto">
        {columnState.map((state, index) => {
          const def = COLUMN_DEFS_BY_ID[state.id]
          const locked = LOCKED_COLUMNS.has(state.id)
          return (
            <div
              key={state.id}
              draggable
              onDragStart={() => {
                dragIndexRef.current = index
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIndex(index)
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault()
                const from = dragIndexRef.current
                dragIndexRef.current = null
                setOverIndex(null)
                if (from !== null && from !== index) onMove(from, index)
              }}
              onDragEnd={() => {
                dragIndexRef.current = null
                setOverIndex(null)
              }}
              className={`flex items-center gap-1 rounded px-1 py-0.5 ${
                overIndex === index ? 'bg-blue-50' : ''
              }`}
            >
              <HolderOutlined className="cursor-grab text-gray-400" />
              <Checkbox
                checked={state.visible}
                disabled={locked}
                onChange={() => onToggle(state.id)}
                className="flex-1"
              >
                {def.title}
              </Checkbox>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === columnState.length - 1}
                onClick={() => onMove(index, index + 1)}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="small" onClick={onReset}>
          Réinitialiser
        </Button>
      </div>
    </div>
  )

  return (
    <Popover content={content} title="Colonnes" trigger="click" placement="bottomRight">
      <Button size="small" icon={<SettingOutlined />}>
        Colonnes
      </Button>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */
/* Bulk edit ("apply a value to several lines")                        */
/* ------------------------------------------------------------------ */

const BULK_FIELDS = [
  { key: 'remise', label: 'Remise', numeric: true },
  { key: 'prixUnitaire', label: 'P.U. HT', numeric: true },
  { key: 'hauteur', label: 'Hauteur', numeric: true },
  { key: 'largeur', label: 'Largeur', numeric: true },
  { key: 'profondeur', label: 'Profondeur', numeric: true },
  { key: 'episseur', label: 'Episseur', numeric: true },
  { key: 'chant', label: 'Chant', numeric: false },
  { key: 'couleur', label: 'Couleur', numeric: false },
  { key: 'nom', label: 'Nom', numeric: false },
  { key: 'description', label: 'Description', numeric: false }
]

const BULK_KEYS = BULK_FIELDS.map((f) => f.key)

const EMPTY_FORM = {
  articleRef: '',
  designation: '',
  hauteur: '',
  largeur: '',
  chant: '',
  couleur: '',
  prixUnitaire: '',
  quantite: '',
  quantityColisee: '',
  conditionnement: '',
  remise: '',
  description: '',
  profondeur: '',
  nom: '',
  episseur: ''
}

export const rowId = (record) => `${record.articleRef}-${record.key}`

const hasKey = (k) => k !== null && k !== undefined
const sameKey = (a, b) => hasKey(a) && hasKey(b) && String(a) === String(b)

/**
 * Builds the body of `lignes/update` from a set of field values.
 * Shared by the single-line save and the bulk edit.
 */
const buildUpdatePayload = (values, articleRef, position) => ({
  key: position,
  articleRef,
  designation: values.designation,
  prixUnitaireHT: Number(values.prixUnitaire) || undefined,
  hauteur: Number(values.hauteur) || 0,
  largeur: Number(values.largeur) || 0,
  chant: values.chant,
  description: values.description ? values.description : '',
  episseur: Number(values.episseur) || 0,
  remiseValeur: Number(values.remise) || undefined,
  remiseType: values.remiseType ?? undefined,
  couleur: values.couleur,
  nom: values.nom ? values.nom : '',
  profondeur: Number(values.profondeur) ? values.profondeur : 0
})

/**
 * Pure helper: moves the selected items one step up or down.
 */
const reorderLineItems = (items, keys, up) => {
  const newItems = [...items]
  const selected = newItems.filter((item) => keys.includes(rowId(item)))
  if (selected.length === 0) return newItems

  const originalIndexMap = new Map()
  items.forEach((item, idx) => originalIndexMap.set(item, idx))

  selected.sort((a, b) =>
    up
      ? originalIndexMap.get(a) - originalIndexMap.get(b)
      : originalIndexMap.get(b) - originalIndexMap.get(a)
  )

  for (const item of selected) {
    const currentIdx = newItems.indexOf(item)
    if (up) {
      if (currentIdx > 0) {
        ;[newItems[currentIdx - 1], newItems[currentIdx]] = [
          newItems[currentIdx],
          newItems[currentIdx - 1]
        ]
      }
    } else {
      if (currentIdx < newItems.length - 1) {
        ;[newItems[currentIdx + 1], newItems[currentIdx]] = [
          newItems[currentIdx],
          newItems[currentIdx + 1]
        ]
      }
    }
  }
  return newItems
}

const DocumentLines = forwardRef(function DocumentLines(
  {
    lineItems: initialLineItems,
    piece,
    documentType,
    onSelectionChange,
    onUpdate,
    onLoadingMovement
  },
  ref
) {
  const { lineItems, setLineItems, updateLineItem, removeLineItems } =
    useLineItems(initialLineItems)

  const [widths, setWidths] = useState(() =>
    Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.defaultWidth]))
  )

  // Column order + visibility (persisted per document type).
  const [columnState, setColumnState] = useState(() => loadColumnState(documentType))

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [editingKey, setEditingKey] = useState(null)
  const [checkedKeys, setCheckedKeys] = useState([])
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [searchModal, setSearchModal] = useState({ open: false, query: '' })

  const [conditionnementOptions, setConditionnementOptions] = useState([])
  const [conditionnementMeta, setConditionnementMeta] = useState({})

  const [bulkLoading, setBulkLoading] = useState(false)

  // Last row clicked, used as the anchor for Shift+click range selection.
  const lastClickedRef = useRef(null)

  const isEditing = hasKey(editingKey)
  // Several lines selected: the filter row switches to bulk mode.
  const isMulti = checkedKeys.length > 1

  // Only the visible columns, in the user's order.
  const visibleColumnDefs = useMemo(
    () => columnState.filter((s) => s.visible).map((s) => COLUMN_DEFS_BY_ID[s.id]),
    [columnState]
  )

  const totalWidth = useMemo(
    () => SELECTION_COLUMN_WIDTH + visibleColumnDefs.reduce((sum, col) => sum + widths[col.key], 0),
    [widths, visibleColumnDefs]
  )

  const filterRowRef = useRef(null)
  const [filterRowHeight, setFilterRowHeight] = useState(0)

  useEffect(() => {
    const el = filterRowRef.current
    if (!el) return undefined

    const updateHeight = () => setFilterRowHeight(el.offsetHeight)
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onSelectionChange?.(checkedKeys)
  }, [checkedKeys, onSelectionChange])

  // Persist the column layout.
  useEffect(() => {
    try {
      window.localStorage.setItem(columnStorageKey(documentType), JSON.stringify(columnState))
    } catch {
      // storage unavailable: layout just won't persist
    }
  }, [columnState, documentType])

  /**
   * On refresh, keep the selection: only drop ids that no longer exist.
   */
  useEffect(() => {
    const existing = new Set(lineItems.map(rowId))
    setCheckedKeys((prev) => {
      const next = prev.filter((id) => existing.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [lineItems])

  /**
   * On refresh, leave edit mode if the edited row no longer exists
   * (prevents "Ligne introuvable" on a stale key).
   */
  useEffect(() => {
    if (!hasKey(editingKey)) return
    if (!lineItems.some((li) => sameKey(li.key, editingKey))) resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItems])

  function resizeColumn(key, startWidth, delta) {
    setWidths((prev) => ({
      ...prev,
      [key]: Math.max(MIN_COLUMN_WIDTH, startWidth + delta)
    }))
  }

  /* ---------------- column customization handlers ---------------- */

  const toggleColumn = useCallback((id) => {
    if (LOCKED_COLUMNS.has(id)) return
    setColumnState((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)))
  }, [])

  const moveColumn = useCallback((from, to) => {
    setColumnState((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const resetColumns = useCallback(() => setColumnState(DEFAULT_COLUMN_STATE), [])

  function handleFieldChange(key, value) {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setFormValues(EMPTY_FORM)
    setEditingKey(null)
    setConditionnementOptions([])
    setConditionnementMeta({})
  }

  const handleOnEnterKeyDown = () => {
    handleSave()
  }

  /**
   * Adds lines on the server, then refetches. The server is the source of
   * truth: no optimistic local add (it created temporary keys that vanished
   * on refetch and broke the edit/selection state).
   */
  const addLines = async (data) => {
    try {
      await api.post(`documents/${documentType}/${piece}/lines`, {
        lignes: data
      })
      await onUpdate?.()
      return true
    } catch (error) {
      console.error(error)
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Erreur lors de l'ajout des lignes"
      )
      return false
    }
  }

  async function handleReferenceKeyDown(e) {
    if (e.key !== 'Enter') return
    const reference = formValues.articleRef?.trim()
    if (!reference) return

    setReferenceLoading(true)
    try {
      const matches = await findArticleByReference(reference)
      if (matches.length === 1) {
        const article = matches[0]
        const ok = await addLines([{ reference, quantite: 1 }])

        if (ok) message.success(`Article "${article.reference}" ajouté`)
        resetForm()
      } else {
        setSearchModal({ open: true, query: reference })
      }
    } catch (err) {
      console.error(err)
      setSearchModal({ open: true, query: reference })
    } finally {
      setReferenceLoading(false)
    }
  }

  async function handleModalConfirm(selectedArticles) {
    setSearchModal({ open: false, query: '' })
    resetForm()

    if (selectedArticles.length > 0) {
      const ok = await addLines(
        selectedArticles.map((item) => ({ reference: item.reference, quantite: 1 }))
      )
      if (ok) {
        message.success(
          selectedArticles.length > 1
            ? `${selectedArticles.length} articles ajoutés`
            : `Article "${selectedArticles[0].reference}" ajouté`
        )
      }
    }
  }

  /**
   * Loads one line into the form (edit mode).
   */
  function handleRowClick(record) {
    setEditingKey(record.key)

    const conditionnements =
      initialLineItems?.find((art) => art.articleRef === record.articleRef)?.conditionnements ?? []

    setConditionnementOptions(
      conditionnements.map((c) => ({
        value: c.enumere,
        label: `${c.enumere} (${c.quantite})`
      }))
    )
    setConditionnementMeta(
      Object.fromEntries(conditionnements.map((c) => [c.enumere, { qte: c.quantite }]))
    )

    const qte = Number(record.quantite) || 0
    const activeConditionnement =
      qte > 0
        ? (conditionnements.find((c) => c.quantite > 0 && Number.isInteger(qte / c.quantite))
            ?.enumere ?? '')
        : ''

    setFormValues({
      articleRef: record.articleRef ?? '',
      designation: record.designation ?? '',
      hauteur: record.hauteur ?? '',
      largeur: record.largeur ?? '',
      chant: record.chant ?? '',
      couleur: record.couleur ?? '',
      prixUnitaire: record.prixUnitaire ?? '',
      quantite: record.quantite ?? '',
      quantityColisee: record.quantityColisee ?? '',
      conditionnement: activeConditionnement,
      remise: record.remise ?? '',
      description: record.description ? record.description : '',
      profondeur: record.profondeur ? record.profondeur : '',
      nom: record.nom ? record.nom : '',
      episseur: record.episseur ? record.episseur : 0
    })
  }

  /**
   * Row selection without checkboxes:
   * - click            → select only this line and edit it
   * - Ctrl/Cmd + click → toggle this line in a multi-selection
   * - Shift + click    → select the range from the last clicked line
   * Edit mode is only active when exactly one line is selected.
   */
  function handleRowSelect(e, record) {
    const id = rowId(record)

    // Ctrl / Cmd + click → toggle row in multi-selection
    if (e.ctrlKey || e.metaKey) {
      const next = checkedKeys.includes(id)
        ? checkedKeys.filter((k) => k !== id)
        : [...checkedKeys, id]

      lastClickedRef.current = id
      setCheckedKeys(next)

      if (next.length === 1) {
        // back to a single line → edit it
        const only = lineItems.find((li) => rowId(li) === next[0])
        if (only) handleRowClick(only)
      } else {
        // none or several lines selected → no edit mode, empty form for bulk input
        resetForm()
      }
      return
    }

    // Shift + click → range selection from the last clicked row
    if (e.shiftKey && lastClickedRef.current) {
      const ids = lineItems.map(rowId)
      const from = ids.indexOf(lastClickedRef.current)
      const to = ids.indexOf(id)
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from]
        const range = ids.slice(start, end + 1)
        setCheckedKeys(range)
        if (range.length > 1) {
          resetForm()
        } else {
          handleRowClick(record)
        }
        return
      }
    }

    // Plain click → select ONLY this line and edit it
    lastClickedRef.current = id
    setCheckedKeys([id])
    handleRowClick(record)
  }

  async function handleSave() {
    if (isMulti) {
      await handleBulkApply()
      return
    }
    if (!isEditing) return

    const item = lineItems.find((li) => sameKey(li.key, editingKey))
    if (!item) {
      message.error('Ligne introuvable')
      resetForm()
      return
    }

    const position = lineItems.indexOf(item) + 1

    const payload = buildUpdatePayload(formValues, item.articleRef, position)

    if (formValues.conditionnement) {
      const qteParCond = conditionnementMeta[formValues.conditionnement]?.qte
      const nbCond = Number(formValues.quantityColisee) || 0

      if (!qteParCond || !nbCond) {
        message.error('Conditionnement incomplet (quantité par colis ou nombre de colis manquant)')
        return
      }

      payload.conditionnement = formValues.conditionnement
      payload.quantiteParConditionnement = qteParCond
      payload.nombreConditionnements = nbCond
    } else {
      payload.quantite = Number(formValues.quantite) || undefined
    }

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/update`, payload)
      updateLineItem(item.key, formValues)
      message.success('Ligne mise à jour')
      resetForm()
      await onUpdate?.()
    } catch (error) {
      console.error(error?.response?.data)
      message.error(
        error?.response?.data?.message || error?.response?.data?.detail || 'Erreur mise à jour'
      )
    }
  }

  /* ---------------- bulk edit (typed in the filter row) ---------------- */

  /**
   * With several lines selected, every non-empty bulk field of the filter row
   * is applied to all selected lines. Updates are sent one after another
   * (the endpoint handles a single line), then one refetch.
   */
  async function handleBulkApply() {
    if (bulkLoading) return

    const filled = BULK_FIELDS.filter((f) => String(formValues[f.key] ?? '').trim() !== '')
    if (filled.length === 0) {
      message.warning('Saisissez une valeur dans au moins un champ')
      return
    }

    const changes = {}
    for (const f of filled) {
      const raw = String(formValues[f.key]).trim()
      if (f.numeric) {
        const n = Number(raw.replace(',', '.'))
        if (Number.isNaN(n)) {
          message.error(`${f.label} : valeur numérique attendue`)
          return
        }
        changes[f.key] = n
      } else {
        changes[f.key] = raw
      }
    }

    setBulkLoading(true)
    let success = 0
    let failed = 0
    let lastError = null

    for (const id of checkedKeys) {
      const item = lineItems.find((li) => rowId(li) === id)
      if (!item) continue

      const position = lineItems.indexOf(item) + 1
      const payload = buildUpdatePayload({ ...item, ...changes }, item.articleRef, position)
      // Keep the current quantity untouched.
      payload.quantite = Number(item.quantite) || undefined

      try {
        await api.post(`documents/${documentType}/${piece}/lignes/update`, payload)
        success += 1
      } catch (error) {
        failed += 1
        lastError = error
        console.error(error?.response?.data || error)
      }
    }

    setBulkLoading(false)
    resetForm() // clear the typed values, keep the selection

    if (success > 0) {
      message.success(success > 1 ? `${success} lignes mises à jour` : 'Ligne mise à jour')
    }
    if (failed > 0) {
      message.error(
        `${failed} ligne${failed > 1 ? 's' : ''} non mise${failed > 1 ? 's' : ''} à jour` +
          (lastError?.response?.data?.message ? ` : ${lastError.response.data.message}` : '')
      )
    }

    await onUpdate?.()
  }

  const handleDelete = useCallback(async () => {
    if (checkedKeys.length === 0) return

    const payload = {
      lines: checkedKeys
        .map((id) => {
          const item = lineItems.find((li) => rowId(li) === id)
          if (!item) return null
          return { ref: item.articleRef, key: lineItems.indexOf(item) + 1 }
        })
        .filter(Boolean)
    }

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/delete`, payload)
      removeLineItems(checkedKeys)
      // Positions shift after a deletion: always leave edit mode.
      resetForm()
      setCheckedKeys([])
      lastClickedRef.current = null
      message.success('Lignes supprimées')
      await onUpdate?.()
    } catch (error) {
      console.error(error)
      message.error('Erreur lors de la suppression des lignes')
    }
  }, [checkedKeys, lineItems, documentType, piece, removeLineItems, onUpdate])

  const handleTransform = useCallback(
    async (target) => {
      if (checkedKeys.length === 0) return
      if (!target) {
        message.error('Veuillez préciser la cible de transformation')
        return
      }

      const positions = checkedKeys
        .map((id) => {
          const item = lineItems.find((li) => rowId(li) === id)
          return item ? lineItems.indexOf(item) + 1 : null
        })
        .filter((pos) => pos !== null)

      try {
        await api.post(`documents/${documentType}/${piece}/transform/lines`, {
          positions,
          target
        })

        setCheckedKeys([])
        message.success(
          positions.length > 1 ? `${positions.length} lignes transformées` : 'Ligne transformée'
        )
        await onUpdate?.()
      } catch (error) {
        console.error(error?.response?.data || error)
        message.error(
          error?.response?.data?.message ||
            error?.response?.data?.detail ||
            'Erreur lors de la transformation des lignes'
        )
      }
    },
    [checkedKeys, lineItems, documentType, piece, onUpdate]
  )

  const buildMovePayload = useCallback(
    () =>
      checkedKeys
        .map((id) => {
          const item = lineItems.find((li) => rowId(li) === id)
          if (!item) return null
          return { ref: item.articleRef, key: lineItems.indexOf(item) + 1 }
        })
        .filter(Boolean),
    [checkedKeys, lineItems]
  )

  /**
   * Reorders locally, then renumbers keys (key = new position) so they match
   * the server's next refetch. Selection and edited row are remapped.
   */
  const applyLocalMove = useCallback(
    (up) => {
      const moved = reorderLineItems(lineItems, checkedKeys, up)
      const selected = new Set(checkedKeys)

      const renumbered = moved.map((item, i) => ({ ...item, key: i + 1 }))
      const newChecked = renumbered.filter((_, i) => selected.has(rowId(moved[i]))).map(rowId)

      setLineItems(renumbered)
      setCheckedKeys(newChecked)
      lastClickedRef.current = null

      if (hasKey(editingKey)) {
        const idx = moved.findIndex((item) => sameKey(item.key, editingKey))
        if (idx >= 0) setEditingKey(idx + 1)
      }
    },
    [lineItems, checkedKeys, editingKey, setLineItems]
  )

  const handleMoveUp = useCallback(async () => {
    if (checkedKeys.length === 0) return
    onLoadingMovement(true)
    try {
      await api.post(`documents/${documentType}/${piece}/lignes/moveup`, {
        lines: buildMovePayload()
      })
      applyLocalMove(true)
    } catch (error) {
      console.error(error)
      message.error(error?.response?.data?.message || 'Erreur lors du déplacement vers le haut')
    } finally {
      onLoadingMovement(false)
    }
  }, [checkedKeys, buildMovePayload, applyLocalMove, documentType, piece, onLoadingMovement])

  const handleMoveDown = useCallback(async () => {
    if (checkedKeys.length === 0) return
    onLoadingMovement(true)
    try {
      await api.post(`documents/${documentType}/${piece}/lignes/movedown`, {
        lines: buildMovePayload()
      })
      applyLocalMove(false)
    } catch (error) {
      console.error(error)
      message.error(error?.response?.data?.message || 'Erreur lors du déplacement vers le bas')
    } finally {
      onLoadingMovement(false)
    }
  }, [checkedKeys, buildMovePayload, applyLocalMove, documentType, piece, onLoadingMovement])

  useImperativeHandle(
    ref,
    () => ({
      moveUp: handleMoveUp,
      moveDown: handleMoveDown,
      delete: handleDelete,
      transform: handleTransform,
      clearSelection: () => {
        setCheckedKeys([])
        lastClickedRef.current = null
      }
    }),
    [handleMoveUp, handleMoveDown, handleDelete, handleTransform]
  )

  const columns = useMemo(
    () =>
      visibleColumnDefs.map(({ key, title, align }) => {
        const startWidth = widths[key]
        const base = {
          key: colId({ key }),
          dataIndex: key,
          align,
          width: startWidth,
          title: (
            <div className="relative pr-1">
              {title}
              <ColumnResizeHandle onResize={(delta) => resizeColumn(key, startWidth, delta)} />
            </div>
          ),
          render: renderCell
        }

        if (key === 'designation') {
          return {
            ...base,
            render: (text, record) => (
              <span className={record.indent ? 'pl-3' : ''}>
                {record.indent ? '+' : ''}
                {text}
              </span>
            )
          }
        }

        if (key === '') {
          return {
            ...base,
            render: (_, record) => {
              const ttc = Number(record.prixUnitaire || 0) * VAT_RATE
              return ttc.toFixed(2)
            }
          }
        }

        return base
      }),
    [widths, visibleColumnDefs]
  )

  const handleShowArticleDetails = useCallback((articleRef) => {
    window.api.open({ url: `/articles/${articleRef}` })
  }, [])

  const handleNew = () => {
    resetForm()
    setCheckedKeys([])
    lastClickedRef.current = null
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Action bar */}
        <div className="flex shrink-0 items-center justify-end gap-1 bg-white px-2 py-1">
          <ColumnSettings
            columnState={columnState}
            onToggle={toggleColumn}
            onMove={moveColumn}
            onReset={resetColumns}
          />
          <Button size="small" onClick={handleNew}>
            Nouveau
          </Button>
          <Button size="small" disabled={checkedKeys.length === 0} onClick={handleDelete}>
            Supprimer
          </Button>
          <Button
            size="small"
            type="primary"
            loading={bulkLoading}
            disabled={!isEditing && !isMulti}
            onClick={handleSave}
          >
            {isMulti ? `Appliquer à ${checkedKeys.length} lignes` : 'Enregistrer'}
          </Button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto bg-white"
          style={{ '--filter-row-height': `${filterRowHeight}px` }}
        >
          <div style={{ width: '100%', minWidth: totalWidth }}>
            <div ref={filterRowRef} className="sticky top-0 z-20 bg-white">
              <ArticleFilterRow
                columnDefs={visibleColumnDefs}
                widths={widths}
                values={formValues}
                onFieldChange={handleFieldChange}
                onReferenceKeyDown={handleReferenceKeyDown}
                onEnterKeyDown={handleOnEnterKeyDown}
                referenceLoading={referenceLoading}
                isEditing={isEditing}
                isMultiEdit={isMulti}
                selectedCount={checkedKeys.length}
                bulkKeys={BULK_KEYS}
                piece={piece}
                conditionnementOptions={conditionnementOptions}
                selectionColumnWidth={SELECTION_COLUMN_WIDTH}
              />
            </div>

            <Table
              columns={columns}
              dataSource={lineItems}
              pagination={false}
              size="small"
              rowKey={rowId}
              onRow={(record) => ({
                onClick: (e) => handleRowSelect(e, record),
                onDoubleClick: () => handleShowArticleDetails(record.articleRef)
              })}
              style={{ width: totalWidth }}
              tableLayout="fixed"
              locale={{ emptyText: <Empty description="Aucun article" /> }}
              className="
                whitespace-nowrap
                [&_.ant-table-content]:overflow-visible!
                [&_.ant-table-thead>tr>th]:sticky
                [&_.ant-table-thead>tr>th]:top-0
                [&_.ant-table-thead>tr>th]:z-10
                [&_.ant-table-thead>tr>th]:py-1!
                [&_.ant-table-thead>tr>th]:!px-2
                [&_.ant-table-tbody>tr>td]:!py-1
                [&_.ant-table-tbody>tr>td]:!px-2
                [&_.ant-table-tbody>tr>td]:overflow-hidden
                [&_.ant-table-tbody>tr>td]:text-ellipsis
                [&_.ant-table-tbody>tr>td]:text-sm
              "
              rowClassName={(record) =>
                `cursor-pointer select-none text-[13px] whitespace-nowrap ${
                  sameKey(record.key, editingKey)
                    ? '[&>td]:bg-blue-100! [&>td:hover]:bg-blue-100!'
                    : checkedKeys.includes(rowId(record))
                      ? '[&>td]:bg-blue-50! [&>td:hover]:bg-blue-50!'
                      : ''
                }`
              }
            />
          </div>
        </div>
      </div>

      <ArticleSearchModal
        open={searchModal.open}
        initialQuery={searchModal.query}
        onCancel={() => setSearchModal({ open: false, query: '' })}
        onConfirm={handleModalConfirm}
      />
    </>
  )
})

export default DocumentLines
