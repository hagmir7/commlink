import { Button, Empty, Table, message } from 'antd'
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

/**
 * Width of the checkbox column injected by `rowSelection`.
 */
const SELECTION_COLUMN_WIDTH = 32

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

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [editingKey, setEditingKey] = useState(null)
  const [checkedKeys, setCheckedKeys] = useState([])
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [searchModal, setSearchModal] = useState({ open: false, query: '' })

  const [conditionnementOptions, setConditionnementOptions] = useState([])
  const [conditionnementMeta, setConditionnementMeta] = useState({})

  const isEditing = hasKey(editingKey)

  const totalWidth = useMemo(
    () => SELECTION_COLUMN_WIDTH + COLUMN_DEFS.reduce((sum, col) => sum + widths[col.key], 0),
    [widths]
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

  async function handleSave() {
    if (!isEditing) return

    const item = lineItems.find((li) => sameKey(li.key, editingKey))
    if (!item) {
      message.error('Ligne introuvable')
      resetForm()
      return
    }

    const position = lineItems.indexOf(item) + 1

    const payload = {
      key: position,
      articleRef: item.articleRef,
      designation: formValues.designation,
      prixUnitaireHT: Number(formValues.prixUnitaire) || undefined,
      hauteur: Number(formValues.hauteur) || 0,
      largeur: Number(formValues.largeur) || 0,
      chant: formValues.chant,
      description: formValues.description ? formValues.description : '',
      episseur: Number(formValues.episseur) || 0,
      remiseValeur: Number(formValues.remise) || undefined,
      remiseType: formValues.remiseType ?? undefined,
      couleur: formValues.couleur,
      nom: formValues.nom ? formValues.nom : '',
      profondeur: Number(formValues.profondeur) ? formValues.profondeur : 0
    }

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
      // message.success('Lignes déplacées vers le haut')
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
      // message.success('Lignes déplacées vers le bas')
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
      clearSelection: () => setCheckedKeys([])
    }),
    [handleMoveUp, handleMoveDown, handleDelete, handleTransform]
  )

  const columns = useMemo(
    () =>
      COLUMN_DEFS.map(({ key, title, align }) => {
        const startWidth = widths[key]
        const base = {
          key: key || 'prixUnitaireTTC',
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
    [widths]
  )

  const rowSelection = {
    columnWidth: SELECTION_COLUMN_WIDTH,
    selectedRowKeys: checkedKeys,
    onChange: (keys) => setCheckedKeys(keys)
  }

  const handleShowArticleDetails = useCallback((articleRef) => {
    window.api.open({ url: `/articles/${articleRef}` })
  }, [])

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Action bar */}
        <div className="flex shrink-0 items-center justify-end gap-1 bg-white px-2 py-1">
          <Button size="small" onClick={resetForm}>
            Nouveau
          </Button>
          <Button size="small" disabled={checkedKeys.length === 0} onClick={handleDelete}>
            Supprimer
          </Button>
          <Button size="small" type="primary" disabled={!isEditing} onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto bg-white"
          style={{ '--filter-row-height': `${filterRowHeight}px` }}
        >
          <div style={{ width: '100%', minWidth: totalWidth }}>
            <div ref={filterRowRef} className="sticky top-0 z-20 bg-white">
              <ArticleFilterRow
                columnDefs={COLUMN_DEFS}
                widths={widths}
                values={formValues}
                onFieldChange={handleFieldChange}
                onReferenceKeyDown={handleReferenceKeyDown}
                onEnterKeyDown={handleOnEnterKeyDown}
                referenceLoading={referenceLoading}
                isEditing={isEditing}
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
              rowSelection={rowSelection}
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
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
                `text-[13px] whitespace-nowrap ${
                  sameKey(record.key, editingKey)
                    ? '[&>td]:bg-blue-100! [&>td:hover]:bg-blue-100!'
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
