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
  { key: 'profondeur', title: 'Profondeur', defaultWidth: 100, placeholder: 'Profondeur' }
]

const MIN_COLUMN_WIDTH = 50
const VAT_RATE = 1.2

/**
 * Width of the checkbox column injected by `rowSelection`.
 * The inputs row reserves the same width so the first input aligns with the
 * first data column.
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
  profondeur: ''
}

export const rowId = (record) => `${record.articleRef}-${record.key}`

const DocumentLines = forwardRef(function DocumentLines(
  {
    lineItems: initialLineItems,
    piece,
    documentType,
    onSelectionChange,
    onUpdate,
    onLoadingMovemen
  },
  ref
) {
  const { lineItems, setLineItems, addArticles, updateLineItem, removeLineItems } =
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

  /**
   * Exact sum of every column width (checkbox + data columns).
   * Used as the table's fixed width and as the minimum width of the wrapper,
   * so the inputs row and the table columns can never drift apart.
   */
  const totalWidth = useMemo(
    () => SELECTION_COLUMN_WIDTH + COLUMN_DEFS.reduce((sum, col) => sum + widths[col.key], 0),
    [widths]
  )

  /**
   * Measured height of the sticky filter row. The table header sticks right
   * below it (top: filterRowHeight) so headers stay visible while scrolling.
   */
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

  async function handleReferenceKeyDown(e) {
    if (e.key !== 'Enter') return
    const reference = formValues.articleRef?.trim()
    if (!reference) return

    setReferenceLoading(true)
    try {
      const matches = await findArticleByReference(reference)
      if (matches.length === 1) {
        const article = matches[0]
        addArticles(article)
        addLines([{ reference, quantite: 1 }])

        message.success(`Article "${article.reference}" ajouté`)
        resetForm()
      } else {
        setSearchModal({ open: true, query: reference })
      }
    } catch (err) {
      console.error(err)
      message.error("Erreur lors de la recherche de l'article")
      setSearchModal({ open: true, query: reference })
    } finally {
      setReferenceLoading(false)
    }
  }

  function handleModalConfirm(selectedArticles) {
    if (selectedArticles.length > 0) {
      addArticles(selectedArticles)
      addLines(selectedArticles.map((item) => ({ reference: item.reference, quantite: 1 })))
      message.success(
        selectedArticles.length > 1
          ? `${selectedArticles.length} articles ajoutés`
          : `Article "${selectedArticles[0].reference}" ajouté`
      )
    }
    setSearchModal({ open: false, query: '' })
    resetForm()
  }

  const addLines = async (data) => {
    try {
      const response = await api.post(`documents/${documentType}/${piece}/lines`, {
        lignes: data
      })
      console.log('created lines:', response.data)
      onUpdate()
    } catch (error) {
      console.error(error)
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
      description: record.description ?? '',
      profondeur: record.profondeur
    })
  }

  async function handleSave() {
    if (!editingKey) return

    const item = lineItems.find((li) => li.key === editingKey)
    if (!item) {
      message.error('Ligne introuvable')
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
      description: formValues.description ?? '',
      episseur: Number(formValues.episseur) || 0,
      remiseValeur: Number(formValues.remise) || undefined,
      remiseType: formValues.remiseType ?? undefined,
      couleur: formValues.couleur,
      profondeur: formValues.profondeur || 0
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
      updateLineItem(editingKey, formValues)
      message.success('Ligne mise à jour')
      onUpdate()
      resetForm()
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
      lines: checkedKeys.map((id) => {
        const item = lineItems.find((li) => `${li.articleRef}-${li.key}` === id)
        const position = lineItems.indexOf(item) + 1
        return { ref: item.articleRef, key: position }
      })
    }

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/delete`, payload)
      removeLineItems(checkedKeys)
      if (editingKey && checkedKeys.some((id) => id.endsWith(`-${editingKey}`))) resetForm()
      setCheckedKeys([])
      onUpdate()
      message.success('Lignes supprimées')
    } catch (error) {
      console.error(error)
      message.error('Erreur lors de la suppression des lignes')
    }
  }, [checkedKeys, lineItems, documentType, piece, editingKey, removeLineItems, onUpdate])

  const reorderLineItems = (items, keys, up) => {
    const newItems = [...items]
    const selected = newItems.filter((item) => keys.includes(`${item.articleRef}-${item.key}`))
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

  const buildMovePayload = useCallback(
    () =>
      checkedKeys.map((id) => {
        const item = lineItems.find((li) => `${li.articleRef}-${li.key}` === id)
        const position = lineItems.indexOf(item) + 1
        return { ref: item.articleRef, key: position }
      }),
    [checkedKeys, lineItems]
  )

  const handleMoveUp = useCallback(async () => {
    if (checkedKeys.length === 0) return
    onLoadingMovemen(true)
    try {
      await api.post(`documents/${documentType}/${piece}/lignes/moveup`, {
        lines: buildMovePayload()
      })
      setLineItems((prev) => reorderLineItems(prev, checkedKeys, true))
      message.success('Lignes déplacées vers le haut')
      onLoadingMovemen(false)
    } catch (error) {
      onLoadingMovemen(false)
      console.error(error)
      message.error('Erreur lors du déplacement vers le haut')
    }
  }, [checkedKeys, buildMovePayload, documentType, piece, setLineItems, onLoadingMovemen])

  const handleMoveDown = useCallback(async () => {
    if (checkedKeys.length === 0) return
    onLoadingMovemen(true)
    try {
      await api.post(`documents/${documentType}/${piece}/lignes/movedown`, {
        lines: buildMovePayload()
      })
      setLineItems((prev) => reorderLineItems(prev, checkedKeys, false))
      message.success('Lignes déplacées vers le bas')
      onLoadingMovemen(false)
    } catch (error) {
      onLoadingMovemen(false)
      console.error(error)
      message.error('Erreur lors du déplacement vers le bas')
    }
  }, [checkedKeys, buildMovePayload, documentType, piece, setLineItems, onLoadingMovemen])

  useImperativeHandle(
    ref,
    () => ({
      moveUp: handleMoveUp,
      moveDown: handleMoveDown,
      delete: handleDelete,
      clearSelection: () => setCheckedKeys([])
    }),
    [handleMoveUp, handleMoveDown, handleDelete]
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
          // 👇 default render for every column: hide 0 / empty values
          render: (value) => {
            if (value === 0 || value === '' || value === null || value === undefined) {
              return ''
            }
            return value
          }
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

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Action bar — kept outside the scroll container so buttons stay reachable */}
        <div className="flex shrink-0 items-center justify-end gap-1 bg-white px-2 py-1">
          <Button size="small" onClick={resetForm}>
            Nouveau
          </Button>
          <Button size="small" disabled={checkedKeys.length === 0} onClick={handleDelete}>
            Supprimer
          </Button>
          <Button size="small" type="primary" disabled={!editingKey} onClick={handleSave}>
            Enregistrer
          </Button>
        </div>

        {/*
          Single scroll container → only ONE horizontal scrollbar for both
          the filter row and the table.
          The wrapper fills the container by default (w-full) but never shrinks
          below `totalWidth`, so the columns keep their pixel widths and stay
          perfectly aligned with the inputs row.
        */}
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
                isEditing={Boolean(editingKey)}
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
                onClick: () => handleRowClick(record)
              })}
              /*
               * Pin the table to the exact sum of column widths so its header
               * is left-aligned with the inputs row (never centered / stretched).
               * No `scroll` prop: the outer wrapper owns horizontal scrolling.
               */
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
                  record.key === editingKey ? '[&>td]:bg-blue-100! [&>td:hover]:bg-blue-100!' : ''
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
