/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tabs,
  message
} from 'antd'
import {
  getClientTarifs,
  getClientTarifsOptions,
  getClientFamilyDiscounts,
  updateClientTarifs,
  saveClientFamilyDiscount,
  deleteClientFamilyDiscount
} from '../../api/client'
import { Panel, Section, Label, Empty } from './primitives'
import DesktopWindow from '../ui/DesktopWindow'

const RATES = [
  ['tauxRemise', 'Taux de remise'],
  ['tauxEscompte', "Taux d'escompte"],
  ['tauxReleve', 'Taux relevé'],
  ['tauxRFA', 'Taux R.F.A.']
]
const PRICING = [
  ['centraleAchatCode', "Centrale d'achat", 'centralesAchat', 'centraleAchatIntitule'],
  [
    'categorieTarifaireCode',
    'Catégorie tarifaire',
    'categoriesTarifaires',
    'categorieTarifaireIntitule'
  ],
  ['representantCode', 'Représentant', 'representants', 'representantNom']
]
const errorText = (err) => err?.response?.data?.message || err?.message || 'Échec de la requête'
const validRate = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100

export default function TarifsTab({ code, tarifs }) {
  const [data, setData] = useState(tarifs)
  const [options, setOptions] = useState({})
  const [families, setFamilies] = useState([])
  const [changes, setChanges] = useState({})
  const [loading, setLoading] = useState(!!code)
  const [error, setError] = useState(null)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const [tariffSaving, setTariffSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form] = Form.useForm()
  const alive = useRef(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    Promise.all([
      getClientTarifs(code),
      getClientTarifsOptions(code),
      getClientFamilyDiscounts(code)
    ])
      .then(([current, choices, discounts]) => {
        if (cancelled) return
        const rows = Array.isArray(discounts) ? discounts : discounts?.familles
        if (!current || !choices || !Array.isArray(rows)) {
          throw new Error('Réponse de tarification invalide')
        }
        setData(current)
        setOptions(choices)
        setFamilies(
          rows.map((row) => ({
            ...row,
            familleCode: row.familleCode ?? row.code,
            familleIntitule: row.familleIntitule ?? row.intitule
          }))
        )
        setChanges({})
        setSelected(null)
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, reload])

  const change = (section, name, value) => {
    setSaveError(null)
    setChanges((prev) => ({
      ...prev,
      [section]: { ...prev[section], [name]: value }
    }))
  }
  const value = (section, name) =>
    Object.hasOwn(changes[section] || {}, name) ? changes[section][name] : data?.[section]?.[name]
  const invalid = RATES.some(
    ([name]) => Object.hasOwn(changes.remises || {}, name) && !validRate(changes.remises[name])
  )
  const dirty = Object.keys(changes).length > 0

  useEffect(() => {
    if (!code || !dirty || invalid || tariffSaving || saveError) return
    const snapshot = changes
    const payload = {
      tarification: {
        centraleAchatCode: data?.tarification?.centraleAchatCode ?? '',
        categorieTarifaireCode: data?.tarification?.categorieTarifaireCode,
        representantCode: data?.tarification?.representantCode ?? 0,
        ...snapshot.tarification
      },
      remises: {
        ...Object.fromEntries(RATES.map(([name]) => [name, data?.remises?.[name] ?? 0])),
        ...snapshot.remises
      }
    }
    const timer = setTimeout(async () => {
      setTariffSaving(true)
      try {
        await updateClientTarifs(code, payload)
        if (!alive.current) return
        setData((prev) => ({
          ...prev,
          tarification: { ...prev?.tarification, ...snapshot.tarification },
          remises: { ...prev?.remises, ...snapshot.remises }
        }))
        // Keep edits made while this request was in flight for the next save.
        setChanges((prev) => {
          const remaining = {}
          for (const [section, fields] of Object.entries(prev)) {
            for (const [name, next] of Object.entries(fields)) {
              if (
                !Object.hasOwn(snapshot[section] || {}, name) ||
                !Object.is(next, snapshot[section][name])
              ) {
                remaining[section] = { ...remaining[section], [name]: next }
              }
            }
          }
          return remaining
        })
      } catch (err) {
        if (alive.current) setSaveError(errorText(err))
      } finally {
        if (alive.current) setTariffSaving(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [changes, code, data, dirty, invalid, tariffSaving, saveError])

  const openEditor = (row) => {
    form.setFieldsValue({
      familleCode: row?.familleCode,
      tauxRemise: row?.tauxRemise ?? 0
    })
    setEditorOpen(true)
  }

  const saveFamily = async () => {
    if (busy) return
    let values
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setBusy(true)
    try {
      await saveClientFamilyDiscount(code, values.familleCode, values.tauxRemise)
      if (!alive.current) return
      const choice = options.familles?.find((item) => item.code === values.familleCode)
      setFamilies((prev) => [
        ...prev.filter((row) => row.familleCode !== values.familleCode),
        { ...values, familleIntitule: choice?.intitule }
      ])
      setSelected(values.familleCode)
      setEditorOpen(false)
      message.success('Remise par famille enregistrée')
    } catch (err) {
      if (alive.current) message.error(errorText(err))
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const removeFamily = async () => {
    if (busy || selected == null) return
    setBusy(true)
    try {
      await deleteClientFamilyDiscount(code, selected)
      if (!alive.current) return
      setFamilies((prev) => prev.filter((row) => row.familleCode !== selected))
      setSelected(null)
      message.success('Remise supprimée')
    } catch (err) {
      if (alive.current) message.error(errorText(err))
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  if (!code)
    return (
      <Panel>
        <Empty text="Enregistrez le client avant de modifier ses tarifs." />
      </Panel>
    )
  if (loading)
    return (
      <Panel>
        <div className="p-6 text-center">
          <Spin />
        </div>
      </Panel>
    )
  if (error)
    return (
      <Panel>
        <Alert
          type="error"
          showIcon
          title={error}
          action={
            <Button
              size="small"
              onClick={() => {
                setLoading(true)
                setError(null)
                setReload((n) => n + 1)
              }}
            >
              Réessayer
            </Button>
          }
        />
      </Panel>
    )

  const selectedFamily = families.find((row) => row.familleCode === selected)
  return (
    <Panel>
      <Section title="Tarification" />
      <div className="grid grid-cols-[160px_minmax(0,1fr)_150px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        {PRICING.map(([name, label, list, display]) => {
          const choices = (options[list] || []).map((item) => ({
            value: item.code,
            label:
              list === 'centralesAchat'
                ? [item.code, item.intitule?.trim()].filter(Boolean).join(' - ')
                : item.intitule || [item.nom, item.prenom].filter(Boolean).join(' ')
          }))
          const stored = value('tarification', name)
          const current =
            name === 'representantCode' && (stored === 0 || stored === '0') ? undefined : stored
          if (
            current != null &&
            current !== '' &&
            !choices.some((item) => item.value === current)
          ) {
            choices.push({
              value: current,
              label:
                list === 'centralesAchat'
                  ? [current, data?.tarification?.[display]?.trim()].filter(Boolean).join(' - ')
                  : data?.tarification?.[display] || String(current)
            })
          }
          return (
            <div key={name} className="contents">
              <Label>{label}</Label>
              <Select
                size="small"
                aria-label={label}
                showSearch
                optionFilterProp="label"
                allowClear={name !== 'categorieTarifaireCode'}
                disabled={busy}
                value={current ?? undefined}
                options={choices}
                onChange={(next) =>
                  change('tarification', name, next ?? (name === 'centraleAchatCode' ? '' : 0))
                }
              />
            </div>
          )
        })}
      </div>
      <Section title="Remises" />
      <div className="grid grid-cols-[160px_minmax(0,1fr)_150px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        {RATES.map(([name, label]) => (
          <div key={name} className="contents">
            <Label>{label}</Label>
            <InputNumber
              size="small"
              aria-label={label}
              className="w-full"
              min={0}
              max={100}
              precision={2}
              decimalSeparator=","
              suffix="%"
              disabled={busy}
              value={value('remises', name)}
              onChange={(next) => change('remises', name, next)}
            />
          </div>
        ))}
      </div>
      {invalid && <p className="text-red-600">Saisissez un taux compris entre 0 et 100.</p>}
      <div className="py-2 text-xs text-gray-500" role="status" aria-live="polite">
        {tariffSaving
          ? 'Enregistrement…'
          : dirty
            ? 'Modifications en attente'
            : 'Modifications enregistrées'}
      </div>
      {saveError && (
        <Alert
          type="error"
          showIcon
          title={saveError}
          description="Les modifications ne sont pas enregistrées."
          action={
            <Button size="small" onClick={() => setSaveError(null)}>
              Réessayer
            </Button>
          }
        />
      )}
      <Tabs
        type="card"
        size="small"
        items={[
          {
            key: 'familles',
            label: 'Remise par famille',
            children: (
              <>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Table
                      rowKey="familleCode"
                      size="small"
                      pagination={false}
                      loading={busy}
                      scroll={{ y: 140 }}
                      className="[&_.ant-table-thead>tr>th]:!py-1 [&_.ant-table-tbody>tr>td]:!py-1"
                      dataSource={families}
                      locale={{ emptyText: 'Aucune remise par famille' }}
                      rowSelection={{
                        type: 'radio',
                        selectedRowKeys: selected == null ? [] : [selected],
                        onChange: (keys) => setSelected(keys[0]),
                        getCheckboxProps: () => ({ disabled: busy })
                      }}
                      onRow={(row) => ({
                        onClick: () => {
                          if (!busy) setSelected(row.familleCode)
                        },
                        onDoubleClick: () => {
                          if (!busy) openEditor(row)
                        }
                      })}
                      columns={[
                        {
                          title: 'Famille',
                          key: 'famille',
                          render: (_, row) =>
                            [row.familleCode, row.familleIntitule].filter(Boolean).join(' ')
                        },
                        {
                          title: 'Remise',
                          dataIndex: 'tauxRemise',
                          align: 'right',
                          width: 120,
                          render: (rate) =>
                            rate == null
                              ? ''
                              : Number(rate).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) +
                                ' %'
                        }
                      ]}
                    />
                  </div>
                  <div className="flex w-[100px] shrink-0 flex-col gap-1">
                    <Button size="small" disabled={busy} onClick={() => openEditor()}>
                      Ajouter
                    </Button>
                    <Button
                      size="small"
                      disabled={busy || !selectedFamily}
                      onClick={() => openEditor(selectedFamily)}
                    >
                      Modifier
                    </Button>
                    <Popconfirm
                      title="Supprimer cette remise ?"
                      okText="Supprimer"
                      cancelText="Annuler"
                      onConfirm={removeFamily}
                      disabled={busy || !selectedFamily}
                    >
                      <Button size="small" danger disabled={busy || !selectedFamily}>
                        Supprimer
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </>
            )
          },
          { key: 'exception', label: "Tarifs d'exception", disabled: true }
        ]}
      />
      <DesktopWindow
        title="Remise par famille"
        open={editorOpen}
        width={440}
        canClose={!busy}
        onClose={() => {
          if (!busy) setEditorOpen(false)
        }}
      >
        <div className="px-4 pt-4">
          <Form form={form} layout="vertical" disabled={busy} className="compact-form space-y-0">
            <Form.Item
              name="familleCode"
              label="Famille"
              rules={[{ required: true, message: 'Sélectionnez une famille' }]}
            >
              <Select
                showSearch
                size="small"
                optionFilterProp="label"
                options={(options.familles || []).map((item) => ({
                  value: item.code,
                  label: item.code + ' ' + item.intitule
                }))}
                style={{ marginBottom: 0 }}
              />
            </Form.Item>
            <Form.Item
              name="tauxRemise"
              label="Taux de remise"
              style={{ marginBottom: 4 }}
              rules={[
                {
                  validator: (_, rate) =>
                    validRate(rate)
                      ? Promise.resolve()
                      : Promise.reject(new Error('Saisissez un taux compris entre 0 et 100'))
                }
              ]}
            >
              <InputNumber
                min={0}
                max={100}
                size="small"
                style={{ width: '100%', marginBottom: 2 }}
                precision={2}

                decimalSeparator=","
                suffix="%"
                className="w-full"
              />
            </Form.Item>
          </Form>
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-300 bg-gradient-to-t from-white to-gray-100 p-2">
          <Button size="small" disabled={busy} onClick={() => setEditorOpen(false)}>
            Annuler
          </Button>
          <Button size="small" type="primary" loading={busy} onClick={saveFamily}>
            Enregistrer
          </Button>
        </footer>
      </DesktopWindow>
    </Panel>
  )
}
