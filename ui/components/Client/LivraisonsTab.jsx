/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  message
} from 'antd'
import {
  getExpeditions,
  getClientLivraisons,
  getClientLivraison,
  createClientLivraison,
  updateClientLivraison,
  deleteClientLivraison
} from '../../api/client'
import DesktopWindow from '../ui/DesktopWindow'
import { Empty, Panel } from './primitives'

const FIELDS = [
  ['intitule', 'Intitulé'],
  ['adresse', 'Adresse'],
  ['complement', 'Complément'],
  ['codePostal', 'Code postal'],
  ['ville', 'Ville'],
  ['region', 'Région'],
  ['pays', 'Pays'],
  ['contact', 'Contact'],
  ['telephone', 'Téléphone'],
  ['telecopie', 'Télécopie'],
  ['email', 'E-mail'],
  ['expedition', 'Expédition'],
  ['conditionLivraison', 'Condition de livraison'],
  ['delaiTransport', 'Délai de transport'],
  ['commentaire', 'Commentaire']
]
const LABEL_FIELDS = new Set(['intitule', 'expedition', 'conditionLivraison'])
const errorText = (err) => {
  const data = err?.response?.data
  return (
    data?.message ||
    data?.detail ||
    data?.title ||
    (typeof data === 'string' ? data : err?.message) ||
    'Échec de la requête'
  )
}
const readList = (response) => {
  const rows = Array.isArray(response) ? response : response?.items
  if (!Array.isArray(rows) || rows.some((row) => row.no == null)) {
    throw new Error('Réponse des livraisons invalide')
  }
  return rows
}
const formValues = (address = {}) =>
  Object.fromEntries(
    FIELDS.map(([name]) => [name, address[name] ?? (name === 'delaiTransport' ? null : '')])
  )

export default function LivraisonsTab({ code, livraisons }) {
  const [items, setItems] = useState(livraisons?.items || [])
  const [loading, setLoading] = useState(!!code)
  const [listError, setListError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editor, setEditor] = useState(null)
  const [editorError, setEditorError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)
  const [reload, setReload] = useState(0)
  const [expeditions, setExpeditions] = useState([])
  const [lookupLoading, setLookupLoading] = useState(true)
  const [lookupError, setLookupError] = useState(null)
  const [lookupReload, setLookupReload] = useState(0)
  const [form] = Form.useForm()
  const alive = useRef(false)
  const locked = useRef(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    getClientLivraisons(code)
      .then((response) => {
        if (!cancelled) {
          setItems(readList(response))
          setListError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setListError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, reload])

  useEffect(() => {
    let cancelled = false
    getExpeditions()
      .then((options) => {
        if (cancelled) return
        if (!Array.isArray(options) || options.some((option) => typeof option !== 'string')) {
          throw new Error('Liste des expéditions invalide')
        }
        setExpeditions(options)
        setLookupError(null)
      })
      .catch((err) => {
        if (!cancelled) setLookupError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lookupReload])

  const refresh = () => {
    setLoading(true)
    setReload((prev) => prev + 1)
  }
  const openCreate = () => {
    setEditorError(null)
    setEditor({ mode: 'create', original: null })
    form.setFieldsValue({ ...formValues(), pays: 'Maroc', delaiTransport: 0 })
  }
  const openEdit = async (row) => {
    if (locked.current || opening || !row) return
    locked.current = true
    setOpening(true)
    try {
      const response = await getClientLivraison(code, row.no)
      if (!alive.current) return
      const address = response?.livraison ?? response
      if (!address || address.no == null || String(address.no) !== String(row.no)) {
        throw new Error('Réponse de livraison invalide')
      }
      setEditorError(null)
      setEditor({ mode: 'edit', no: row.no, original: address })
      form.setFieldsValue(formValues(address))
    } catch (err) {
      if (alive.current) message.error(errorText(err))
    } finally {
      locked.current = false
      if (alive.current) setOpening(false)
    }
  }

  const save = async () => {
    if (locked.current || !editor) return
    locked.current = true
    try {
      let values
      try {
        values = await form.validateFields()
      } catch {
        return
      }
      const original = formValues(editor.original || {})
      // Whitelist writable fields: never send no, clientCode, or principal.
      const payload = Object.fromEntries(
        FIELDS.flatMap(([name]) => {
          let next = values[name]
          if (next == null) return []
          if (LABEL_FIELDS.has(name)) next = next.trim()
          if (editor.mode === 'edit' && next === original[name]) return []
          if (name !== 'intitule' && LABEL_FIELDS.has(name) && !next) return []
          return [[name, next]]
        })
      )
      if (!Object.keys(payload).length) {
        setEditor(null)
        return
      }
      setBusy(true)
      setEditorError(null)
      const result =
        editor.mode === 'create'
          ? await createClientLivraison(code, payload)
          : await updateClientLivraison(code, editor.no, payload)
      if (!alive.current) return
      setSelected(result?.no ?? result?.livraison?.no ?? editor.no ?? null)
      setEditor(null)
      message.success(
        editor.mode === 'create' ? 'Adresse de livraison créée' : 'Adresse de livraison mise à jour'
      )
      // Always reload, including responses marked reloadRequired by Sage.
      refresh()
    } catch (err) {
      if (alive.current) setEditorError(errorText(err))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }

  const remove = async () => {
    if (locked.current || !deleteTarget || deleteTarget.principal !== false) return
    locked.current = true
    setBusy(true)
    setDeleteError(null)
    try {
      await deleteClientLivraison(code, deleteTarget.no)
      if (!alive.current) return
      setItems((prev) => prev.filter((row) => row.no !== deleteTarget.no))
      setSelected(null)
      setDeleteTarget(null)
      message.success('Adresse de livraison supprimée')
      refresh()
    } catch (err) {
      if (alive.current) setDeleteError(errorText(err))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }

  const renderField = (name, label, wide = false) => {
    const rules =
      name === 'intitule'
        ? [{ required: true, whitespace: true, message: 'Saisissez un intitulé' }]
        : name === 'email'
          ? [{ type: 'email', message: 'Adresse e-mail invalide' }]
          : name === 'expedition' || name === 'conditionLivraison'
            ? [
                {
                  validator: (_, value) => {
                    const original = editor?.original?.[name] || ''
                    return typeof value === 'string' && value !== original && !value.trim()
                      ? Promise.reject(new Error('Le libellé ne peut pas être vide'))
                      : Promise.resolve()
                  }
                }
              ]
            : name === 'delaiTransport'
              ? [{ type: 'integer', min: 0, message: 'Saisissez un délai entier positif ou nul' }]
              : []
    let input = <Input id={'livraison_' + name} autoFocus={name === 'intitule'} />
    if (name === 'delaiTransport') {
      input = (
        <InputNumber
          id={'livraison_' + name}
          min={0}
          precision={0}
          className="w-full"
          style={{ width: '100%' }}
        />
      )
    } else if (name === 'expedition') {
      const choices = [
        ...new Set([
          ...expeditions,
          ...(editor?.original?.expedition ? [editor.original.expedition] : [])
        ])
      ]
      input = (
        <Select
          id={'livraison_' + name}
          showSearch
          optionFilterProp="label"
          loading={lookupLoading}
          disabled={busy || lookupLoading || !!lookupError}
          placeholder="Sélectionner…"
          options={choices.map((value) => ({ value, label: value }))}
        />
      )
    } else if (name === 'conditionLivraison') {
      input = <Select id={'livraison_' + name} options={[]} placeholder="—" disabled />
    } else if (name === 'pays') {
      const choices = [
        ...new Set(['Maroc', 'France', 'Espagne', editor?.original?.pays].filter(Boolean))
      ]
      input = (
        <AutoComplete
          id={'livraison_' + name}
          options={choices.map((value) => ({ value, label: value }))}
          filterOption={(query, option) => option.value.toLowerCase().includes(query.toLowerCase())}
        />
      )
    }
    return (
      <div
        className={
          wide
            ? 'col-span-2 grid grid-cols-[100px_minmax(0,1fr)] items-start gap-x-1'
            : 'grid grid-cols-[100px_minmax(0,1fr)] items-start gap-x-1'
        }
      >
        <label
          htmlFor={'livraison_' + name}
          className="truncate text-right text-[12px] leading-6"
          title={label}
        >
          {label}
        </label>
        <Form.Item name={name} rules={rules} style={{ marginBottom: 0 }}>
          {input}
        </Form.Item>
      </div>
    )
  }

  if (!code)
    return (
      <Panel>
        <Empty text="Enregistrez le client avant de gérer ses livraisons." />
      </Panel>
    )
  const selectedRow = items.find((row) => row.no === selected)
  const disabled = busy || opening || loading || !!editor || !!deleteTarget
  return (
    <Panel>
      {listError && (
        <Alert
          type="warning"
          showIcon
          title="Actualisation des livraisons impossible"
          description={listError}
          action={
            <Button size="small" disabled={loading} onClick={refresh}>
              Réessayer
            </Button>
          }
        />
      )}
      <div className="flex gap-2 py-2">
        <div className="min-w-0 flex-1">
          <Table
            size="small"
            rowKey="no"
            loading={loading}
            dataSource={items}
            pagination={false}
            scroll={{ x: 'max-content', y: 180 }}
            className="whitespace-nowrap [&_.ant-table-thead>tr>th]:!px-2 [&_.ant-table-thead>tr>th]:!py-0.5 [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!leading-4 [&_.ant-table-tbody>tr>td]:!py-1"
            locale={{ emptyText: 'Aucune adresse de livraison' }}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selected == null ? [] : [selected],
              onChange: (keys) => setSelected(keys[0]),
              getCheckboxProps: () => ({ disabled })
            }}
            onRow={(row) => ({
              onClick: () => {
                if (!disabled) setSelected(row.no)
              },
              onDoubleClick: () => {
                if (!disabled) openEdit(row)
              }
            })}
            columns={[
              {
                title: 'Intitulé du lieu de livraison',
                dataIndex: 'intitule',
                width: 220,
                render: (value, row) => (
                  <>
                    {value} {row.principal && <Tag color="blue">Principal</Tag>}
                  </>
                )
              },
              { title: 'Code postal', dataIndex: 'codePostal', width: 90 },
              { title: 'Ville', dataIndex: 'ville', width: 120 },
              { title: 'Contact', dataIndex: 'contact', width: 120 },
              { title: 'Téléphone', dataIndex: 'telephone', width: 110 },
              { title: 'Adresse', dataIndex: 'adresse', width: 180 },
              { title: 'Complément', dataIndex: 'complement', width: 150 }
            ]}
          />
        </div>
        <div className="flex w-[100px] shrink-0 flex-col gap-1">
          <Button
            size="small"
            disabled={disabled || !selectedRow}
            loading={opening}
            onClick={() => openEdit(selectedRow)}
          >
            Ouvrir…
          </Button>
          <Button size="small" disabled={disabled} onClick={openCreate}>
            Ajouter…
          </Button>
          <Button
            size="small"
            danger
            disabled={disabled || selectedRow?.principal !== false}
            title={
              selectedRow?.principal ? 'L’adresse principale ne peut pas être supprimée' : undefined
            }
            onClick={() => {
              setDeleteError(null)
              setDeleteTarget(selectedRow)
            }}
          >
            Supprimer
          </Button>
        </div>
      </div>
      <DesktopWindow
        open={!!editor}
        width={700}
        canClose={!busy}
        title={'Adresse de livraison ' + code + (editor?.mode === 'create' ? ' — Nouvelle' : '')}
        onClose={() => {
          if (!busy) setEditor(null)
        }}
      >
        <div className="px-3 pt-2 text-[#003b70]">
          {editorError && <Alert type="error" showIcon title={editorError} className="mb-2" />}
          {lookupError && (
            <Alert
              type="warning"
              showIcon
              title="Expéditions indisponibles"
              description={lookupError}
              action={
                <Button
                  size="small"
                  onClick={() => {
                    setLookupLoading(true)
                    setLookupReload((prev) => prev + 1)
                  }}
                >
                  Réessayer
                </Button>
              }
              className="mb-2"
            />
          )}
          <Form form={form} size="small" disabled={busy} requiredMark={false} onFinish={save}>
            <section aria-label="Identification" className="min-w-0 pb-2">
              <Divider
                titlePlacement="start"
                style={{ margin: '4px 0', fontSize: 14 }}
                styles={{ content: { margin: 0 } }}
              >
                Identification
              </Divider>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                {renderField('intitule', 'Intitulé', true)}
                {renderField('contact', 'Contact', true)}
                {renderField('expedition', 'Expédition')}
                {renderField('conditionLivraison', 'Condition')}
                {renderField('commentaire', 'Commentaire', true)}
                {renderField('delaiTransport', 'Délai de transport')}
              </div>
            </section>
            <section aria-label="Coordonnées" className="min-w-0 pb-2">
              <Divider
                titlePlacement="start"
                style={{ margin: '4px 0', fontSize: 14 }}
                styles={{ content: { margin: 0 } }}
              >
                Coordonnées
              </Divider>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                {renderField('adresse', 'Adresse', true)}
                {renderField('complement', 'Complément', true)}
                {renderField('codePostal', 'Code postal')}
                {renderField('ville', 'Ville')}
                {renderField('region', 'Région')}
                {renderField('pays', 'Pays')}
              </div>
            </section>
            <section aria-label="Télécommunication" className="min-w-0 pb-2">
              <Divider
                titlePlacement="start"
                style={{ margin: '4px 0', fontSize: 14 }}
                styles={{ content: { margin: 0 } }}
              >
                Télécommunication
              </Divider>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                {renderField('telephone', 'Téléphone')}
                {renderField('telecopie', 'Télécopie')}
                {renderField('email', 'E-mail', true)}
              </div>
            </section>
          </Form>
        </div>
        <footer
          style={{ bottom: '-3px' }}
          className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2"
        >
          <Button size="small" disabled={busy} onClick={openCreate}>
            Nouveau
          </Button>
          <Button size="small" type="primary" loading={busy} onClick={save}>
            OK
          </Button>
          <Button size="small" disabled={busy} onClick={() => setEditor(null)}>
            Annuler
          </Button>
        </footer>
      </DesktopWindow>
      <DesktopWindow
        open={!!deleteTarget}
        width={420}
        canClose={!busy}
        title="Supprimer l’adresse de livraison"
        onClose={() => {
          if (!busy) setDeleteTarget(null)
        }}
      >
        <div className="p-4">
          <p>Supprimer l’adresse « {deleteTarget?.intitule} » ?</p>
          {deleteError && <Alert type="error" showIcon title={deleteError} />}
        </div>
        <footer className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <Button size="small" disabled={busy} onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button size="small" type="primary" danger loading={busy} onClick={remove}>
            Supprimer
          </Button>
        </footer>
      </DesktopWindow>
    </Panel>
  )
}
