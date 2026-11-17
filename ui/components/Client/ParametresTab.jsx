/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, DatePicker, Form, Input, InputNumber, Select, Spin } from 'antd'
import dayjs from 'dayjs'
import { Panel, Empty, Section } from './primitives'
import './ParametresTab.css'
import {
  getClientParametres,
  getClientParametresOptions,
  updateClientParametres
} from '../../api/client'
import {
  buildClientParametersPatch,
  clientParameterOptions,
  EMPTY_SAGE_DATE,
  parameterDate
} from '../../utils/clientParametres'

const DOCUMENT_FIELDS = [
  ['depotCode', 'Dépôt de rattachement', 'depots', 'depotIntitule'],
  ['codeAffaire', 'Code affaire', 'codesAffaire'],
  ['deviseCode', 'Devise', 'devises', 'deviseIntitule'],
  ['langueCode', 'Langue', 'langues', 'langueLabel'],
  ['periodiciteCode', 'Périodicité', 'periodicites', 'periodiciteIntitule'],
  ['prioriteLivraison', 'Priorité livraison', null, null, 'number'],
  ['raccourci', 'Raccourci'],
  ['delaiTransport', 'Délai de transport', null, null, 'number'],
  ['codeEDI', 'Code EDI']
]
const CHECKBOXES = [
  ['factureParBonLivraison', 'Établir une facture par bon de livraison'],
  ['autoriserLivraisonPartielle', 'Autoriser la livraison partielle'],
  ['mettreEnSommeil', 'Mettre en sommeil'],
  ['exclureMarketing', 'Exclure des traitements à des fins marketing']
]
const errorText = (error) => {
  const data = error?.response?.data
  if (data?.errors) return Object.values(data.errors).flat().join(' ')
  return (
    data?.message ||
    data?.detail ||
    data?.title ||
    (typeof data === 'string' ? data : error?.message) ||
    'Échec de la requête.'
  )
}
const readParameters = (data) => {
  if (!data?.saisieDocument || !data?.periodeFermeture || !data?.comptabilite) {
    throw new Error('Réponse des paramètres du client invalide.')
  }
  return data
}
const GridParams = ({ children }) => <div className="client-parameters-grid">{children}</div>
export default function ParametresTab({ code, parametres }) {
  const [data, setData] = useState(parametres)
  const [options, setOptions] = useState({})
  const [changes, setChanges] = useState({})
  const [loading, setLoading] = useState(!!code)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [refreshError, setRefreshError] = useState(null)
  const [reload, setReload] = useState(0)
  const alive = useRef(false)
  const busy = useRef(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    Promise.all([getClientParametres(code), getClientParametresOptions(code)])
      .then(([current, choices]) => {
        if (cancelled) return
        const next = readParameters(current)
        const nextOptions = clientParameterOptions(choices)
        setData(next)
        setOptions(nextOptions)
        setChanges({})
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorText(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, reload])

  const value = (section, name) =>
    Object.hasOwn(changes[section] || {}, name) ? changes[section][name] : data?.[section]?.[name]
  let patch = {}
  let validationError = null
  try {
    for (const name of ['prioriteLivraison', 'delaiTransport']) {
      if (
        Object.hasOwn(changes.saisieDocument || {}, name) &&
        changes.saisieDocument[name] == null
      ) {
        throw new Error('Renseignez la priorité et le délai de transport (0 si aucun).')
      }
    }
    patch = buildClientParametersPatch(data, changes)
  } catch (error) {
    validationError = error.message
  }
  const dirty = Object.keys(changes).length > 0
  const patchKey = JSON.stringify(patch)

  useEffect(() => {
    if (
      !code ||
      !dirty ||
      validationError ||
      saving ||
      loading ||
      loadError ||
      saveError ||
      refreshError ||
      patchKey === '{}'
    )
      return
    const snapshot = JSON.parse(patchKey)
    const timer = setTimeout(async () => {
      if (busy.current) return
      busy.current = true
      setSaving(true)
      try {
        const response = await updateClientParametres(code, snapshot)
        if (response?.success === false)
          throw new Error(response.message || "L'enregistrement a échoué.")
        if (!alive.current) return
        // The write succeeded; never submit it again just because a subsequent GET fails.
        setData((previous) =>
          Object.fromEntries(
            Object.entries(previous).map(([section, fields]) => [
              section,
              snapshot[section] ? { ...fields, ...snapshot[section] } : fields
            ])
          )
        )
        setChanges({})
        try {
          const updated = readParameters(await getClientParametres(code))
          if (alive.current) setData(updated)
        } catch (error) {
          if (alive.current) setRefreshError(errorText(error))
        }
      } catch (error) {
        if (alive.current) setSaveError(errorText(error))
      } finally {
        busy.current = false
        if (alive.current) setSaving(false)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [code, dirty, validationError, saving, loading, loadError, saveError, refreshError, patchKey])

  useEffect(() => {
    if (!dirty && !saving) return
    const preventUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [dirty, saving])

  const disabled = loading || saving || !!loadError || !!refreshError
  const change = (section, name, next) => {
    if (disabled || busy.current) return
    setSaveError(null)
    setChanges((previous) => {
      const fields = { ...previous[section], [name]: next }
      if (Object.is(next, data?.[section]?.[name])) delete fields[name]
      const result = { ...previous, [section]: fields }
      if (!Object.keys(fields).length) delete result[section]
      return result
    })
  }
  const changeDate = (name, date) => {
    if (disabled || busy.current) return
    if (date) change('periodeFermeture', name, date.format('YYYY-MM-DD'))
    else {
      setSaveError(null)
      setChanges((previous) => ({
        ...previous,
        periodeFermeture: {
          dateDebut: EMPTY_SAGE_DATE,
          dateFin: EMPTY_SAGE_DATE
        }
      }))
    }
  }
  const retryLoad = () => {
    setLoading(true)
    setLoadError(null)
    setRefreshError(null)
    setSaveError(null)
    setReload((count) => count + 1)
  }
  const select = (section, name, list, labelName) => {
    const selected = value(section, name)
    const choices = [...(options[list] || [])]
    if (['depotCode', 'deviseCode'].includes(name) && !choices.some((item) => item.value === 0)) {
      choices.unshift({ value: 0, label: 'Aucun' })
    }
    // An existing code may remain valid even when not configured in the dropdown.
    if (selected != null && selected !== '' && !choices.some((item) => item.value === selected)) {
      choices.push({ value: selected, label: data?.[section]?.[labelName] || `Code ${selected}` })
    }
    return (
      <Select
        id={`client-parameter-${name}`}
        size="small"
        className={`w-full ${name === 'codeAffaire' ? 'client-parameters-affaire' : ''}`}
        disabled={disabled}
        value={selected === '' ? undefined : selected}
        options={choices}
        showSearch
        optionFilterProp="label"
        allowClear={['depotCode', 'deviseCode', 'codeAffaire'].includes(name)}
        onChange={(next) => change(section, name, next ?? (name === 'codeAffaire' ? '' : 0))}
      />
    )
  }

  if (!code)
    return (
      <Panel>
        <Empty text="Enregistrez le client avant de modifier ses paramètres." />
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
  if (loadError)
    return (
      <Panel>
        <Alert
          type="error"
          showIcon
          title={loadError}
          action={
            <Button size="small" onClick={retryLoad}>
              Réessayer
            </Button>
          }
        />
      </Panel>
    )

  return (
    <Panel>
      <Form
        className="client-parameters"
        layout="horizontal"
        size="small"
        colon={false}
        requiredMark={false}
        labelCol={{ flex: '160px' }}
        wrapperCol={{ flex: 'auto' }}
      >
        <Section title="Saisie de document" />
        <GridParams>
          {DOCUMENT_FIELDS.map(([name, label, list, labelName, type]) => (
            <Form.Item key={name} label={label} htmlFor={`client-parameter-${name}`}>
              {list ? (
                select('saisieDocument', name, list, labelName)
              ) : type === 'number' ? (
                <InputNumber
                  id={`client-parameter-${name}`}
                  size="small"
                  className="!w-full"
                  min={0}
                  controls={false}
                  precision={0}
                  disabled={disabled}
                  value={value('saisieDocument', name)}
                  onChange={(next) => change('saisieDocument', name, next)}
                />
              ) : (
                <Input
                  id={`client-parameter-${name}`}
                  size="small"
                  disabled={disabled}
                  value={value('saisieDocument', name) ?? ''}
                  onChange={(event) => change('saisieDocument', name, event.target.value)}
                />
              )}
            </Form.Item>
          ))}
        </GridParams>
        <div className="client-parameters-checkboxes">
          {CHECKBOXES.map(([name, label]) => (
            <Form.Item key={name}>
              <Checkbox
                disabled={disabled}
                checked={!!value('saisieDocument', name)}
                onChange={(event) => change('saisieDocument', name, event.target.checked)}
              >
                {label}
              </Checkbox>
            </Form.Item>
          ))}
        </div>
        <Section title="Période de fermeture" />
        <GridParams>
          {[
            ['dateDebut', 'Date début'],
            ['dateFin', 'Date fin']
          ].map(([name, label]) => {
            const date = parameterDate(value('periodeFermeture', name))
            return (
              <Form.Item key={name} label={label} htmlFor={`client-parameter-${name}`}>
                <DatePicker
                  id={`client-parameter-${name}`}
                  size="small"
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder=""
                  suffixIcon={null}
                  disabled={disabled}
                  value={date && dayjs(date).isValid() ? dayjs(date) : null}
                  onChange={(next) => changeDate(name, next)}
                />
              </Form.Item>
            )
          })}
        </GridParams>
        <Section title="Comptabilité" />
        <GridParams>
          <Form.Item label="Catégorie comptable" htmlFor="client-parameter-categorieComptableCode">
            {select(
              'comptabilite',
              'categorieComptableCode',
              'categoriesComptables',
              'categorieComptableIntitule'
            )}
          </Form.Item>
        </GridParams>
        <div className="mt-4 space-y-2" aria-live="polite">
          {validationError && <Alert type="warning" showIcon title={validationError} />}
          {saveError && (
            <Alert
              type="error"
              showIcon
              title={saveError}
              action={
                <Button size="small" onClick={() => setSaveError(null)}>
                  Réessayer
                </Button>
              }
            />
          )}
          {refreshError && (
            <Alert
              type="warning"
              showIcon
              title="Paramètres enregistrés, mais relecture impossible."
              description={refreshError}
              action={
                <Button size="small" onClick={retryLoad}>
                  Actualiser
                </Button>
              }
            />
          )}
          <div className="text-xs text-gray-500">
            {saving ? 'Enregistrement…' : dirty ? 'Modifications en attente…' : null}
          </div>
        </div>
      </Form>
    </Panel>
  )
}
