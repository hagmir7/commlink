import { Empty, Table, message } from 'antd'
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

const COLUMN_DEFS = [
  { key: 'articleRef', title: 'Référence', defaultWidth: 95, placeholder: 'Référence' },
  { key: 'designation', title: 'Désignation', defaultWidth: 280, placeholder: 'Désignation' },
  { key: 'hauteur', title: 'Hauteur', defaultWidth: 100, placeholder: 'Hauteur' },
  { key: 'largeur', title: 'Largeur', defaultWidth: 100, placeholder: 'Largeur' },
  { key: 'chant', title: 'Chant', defaultWidth: 50, placeholder: 'Chant' },
  { key: 'couleur', title: 'Couleur', defaultWidth: 100, placeholder: 'Couleur' },
  { key: 'prixUnitaire', title: 'P.U. HT', defaultWidth: 90, placeholder: 'P.U. HT' },
  { key: '', title: 'P.U. TTC', defaultWidth: 70, placeholder: 'P.U. TTC' },
  { key: 'quantite', title: 'Quantité', defaultWidth: 80, placeholder: 'Quantité' },
  { key: 'qteColisee', title: 'Qté colisée', defaultWidth: 80, placeholder: 'Qté colisée' },
  { key: 'remise', title: 'Remise', defaultWidth: 70, placeholder: 'Remise' }
]

const MIN_COLUMN_WIDTH = 50
const VAT_RATE = 1.2

const EMPTY_FORM = {
  articleRef: '',
  designation: '',
  hauteur: '',
  largeur: '',
  chant: '',
  couleur: '',
  prixUnitaire: '',
  quantite: '',
  qteColisee: '',
  remise: ''
}

export const rowId = (record) => `${record.articleRef}-${record.key}`

const DocumentLines = forwardRef(function DocumentLines(
  { lineItems: initialLineItems, piece, documentType, onSelectionChange },
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

  const totalWidth = useMemo(() => Object.values(widths).reduce((sum, w) => sum + w, 0), [widths])

  const tableWrapRef = useRef(null)
  const [bodyHeight, setBodyHeight] = useState(300)

  // Notify parent whenever the selection changes
  useEffect(() => {
    onSelectionChange?.(checkedKeys)
  }, [checkedKeys, onSelectionChange])

  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return undefined

    const HEADER_ROW_HEIGHT = 39
    const updateHeight = () => {
      const available = el.clientHeight - HEADER_ROW_HEIGHT
      setBodyHeight(Math.max(120, available))
    }
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
  }

  async function handleReferenceKeyDown(e) {
    if (e.key !== 'Enter') return
    const reference = formValues.articleRef?.trim()
    if (!reference) return

    setReferenceLoading(true)
    try {
      const matches = await findArticleByReference(reference)
      if (matches.length === 1) {
        addArticles(matches[0])
        addLines([{ reference, quantite: 1 }])
        message.success(`Article "${matches[0].reference}" ajouté`)
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
    } catch (error) {
      console.error(error)
    }
  }

  function handleRowClick(record) {
    setEditingKey(record.key)
    setFormValues({
      articleRef: record.articleRef ?? '',
      designation: record.designation ?? '',
      hauteur: record.hauteur ?? '',
      largeur: record.largeur ?? '',
      chant: record.chant ?? '',
      couleur: record.couleur ?? '',
      prixUnitaire: record.prixUnitaire ?? '',
      quantite: record.quantite ?? '',
      qteColisee: record.qteColisee ?? '',
      remise: record.remise ?? ''
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
      quantite: Number(formValues.quantite) || undefined,
      hauteur: Number(formValues.hauteur) || 0,
      largeur: Number(formValues.largeur) || 0,
      chant: formValues.chant,
      description: formValues.description ?? '',
      episseur: Number(formValues.episseur) || 0,
      remiseValeur: Number(formValues.remise) || undefined,
      remiseType: formValues.remiseType ?? undefined,
      couleur: formValues.couleur
    }

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/update`, payload)
      updateLineItem(editingKey, formValues)
      message.success('Ligne mise à jour')
      resetForm()
    } catch (error) {
      console.error(error)
      message.error('Erreur lors de la mise à jour de la ligne')
    }
  }

  // --- Delete ---------------------------------------------------------

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
      message.success('Lignes supprimées')
    } catch (error) {
      console.error(error)
      message.error('Erreur lors de la suppression des lignes')
    }
  }, [checkedKeys, lineItems, documentType, piece, editingKey, removeLineItems])

  // --- Move up / Move down --------------------------------------------

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

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/moveup`, {
        lines: buildMovePayload()
      })
      setLineItems((prev) => reorderLineItems(prev, checkedKeys, true))
      message.success('Lignes déplacées vers le haut')
    } catch (error) {
      console.error(error)
      message.error('Erreur lors du déplacement vers le haut')
    }
  }, [checkedKeys, buildMovePayload, documentType, piece, setLineItems])

  const handleMoveDown = useCallback(async () => {
    if (checkedKeys.length === 0) return

    try {
      await api.post(`documents/${documentType}/${piece}/lignes/movedown`, {
        lines: buildMovePayload()
      })
      setLineItems((prev) => reorderLineItems(prev, checkedKeys, false))
      message.success('Lignes déplacées vers le bas')
    } catch (error) {
      console.error(error)
      message.error('Erreur lors du déplacement vers le bas')
    }
  }, [checkedKeys, buildMovePayload, documentType, piece, setLineItems])

  // Expose imperative actions to the parent
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

  // --- Columns ---------------------------------------------------------

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
          )
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
    selectedRowKeys: checkedKeys,
    onChange: (keys) => setCheckedKeys(keys)
  }

  return (
    <>
      <ArticleFilterRow
        columnDefs={COLUMN_DEFS}
        widths={widths}
        values={formValues}
        onFieldChange={handleFieldChange}
        onReferenceKeyDown={handleReferenceKeyDown}
        referenceLoading={referenceLoading}
        isEditing={Boolean(editingKey)}
        canDelete={checkedKeys.length > 0}
        onNew={resetForm}
        onDelete={handleDelete}
        onSave={handleSave}
      />

      <div ref={tableWrapRef} className="bg-white flex-1 min-h-0">
        <Table
          columns={columns}
          dataSource={lineItems}
          pagination={false}
          size="small"
          rowKey={rowId}
          rowSelection={rowSelection}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: record.key === editingKey ? 'bg-blue-100' : ''
          })}
          className="
            whitespace-nowrap
              [&_.ant-table-thead>tr>th]:py-1!
              [&_.ant-table-thead>tr>th]:!px-2
              [&_.ant-table-tbody>tr>td]:!py-1
              [&_.ant-table-tbody>tr>td]:!px-2
              [&_.ant-table-tbody>tr>td]:text-sm
            "
          rowClassName={(record) =>
            `text-[13px] whitespace-nowrap ${
              record.key === editingKey ? '[&>td]:bg-blue-100! [&>td:hover]:bg-blue-100!' : ''
            }`
          }
          scroll={{ x: totalWidth, y: bodyHeight }}
          tableLayout="fixed"
          locale={{ emptyText: <Empty description="Aucun article" /> }}
        />
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
