import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Spin, Tabs, message } from 'antd'
import {
  getClientIdentification,
  getClientTarifs,
  getClientParametres,
  getClientLivraisons,
  createClient,
  updateClient
} from '../../api/client'
import IdentificationTab from './IdentificationTab'
import TarifsTab from './TarifsTab'
import ParametresTab from './ParametresTab'
import LivraisonsTab from './LivraisonsTab'

const INITIAL_VALUES = {
  identification: {
    compteTiers: '',
    prospect: false,
    intitule: '',
    qualite: '',
    abrege: '',
    compteCollectif: '34210000',
    interlocuteur: '',
    commentaire: ''
  },
  coordonnees: {
    adresse: '',
    complement: '',
    codePostal: '',
    ville: '',
    region: '',
    pays: 'Maroc'
  },
  telecom: {
    telephone: '',
    telecopie: '',
    linkedIn: '',
    facebook: '',
    email: '',
    siteInternet: ''
  },
  immatriculation: {
    siret: '',
    codeNaf: '',
    identifiantTva: ''
  }
}

export default function ClientForm({ onSave, onCancel }) {
  const { num } = useParams()
  const navigate = useNavigate()

  // Local state to allow "mode" to change without URL navigation.
  // - isNew = true           → create mode (POST)
  // - isNew = false + code   → edit mode  (PUT)
  const [createdCode, setCreatedCode] = useState(null)
  const [isNew, setIsNew] = useState(!num)

  const effectiveCode = isNew ? null : createdCode || num
  const isEdit = !!effectiveCode

  const [activeTab, setActiveTab] = useState('identification')
  const [values, setValues] = useState(INITIAL_VALUES)
  const [tarifs, setTarifs] = useState(null)
  const [parametres, setParametres] = useState(null)
  const [livraisons, setLivraisons] = useState(null)
  const [loading, setLoading] = useState(!!num)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  /* ---------- load existing client ---------- */
  useEffect(() => {
    if (!num) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.allSettled([
      getClientIdentification(num),
      getClientTarifs(num),
      getClientParametres(num),
      getClientLivraisons(num)
    ])
      .then(([idRes, tarRes, parRes, livRes]) => {
        if (cancelled) return
        if (idRes.status === 'fulfilled' && idRes.value) {
          const v = idRes.value
          setValues({
            identification: v.identification || INITIAL_VALUES.identification,
            coordonnees: v.coordonnees || INITIAL_VALUES.coordonnees,
            telecom: v.telecom || INITIAL_VALUES.telecom,
            immatriculation: v.immatriculation || INITIAL_VALUES.immatriculation
          })
        } else if (idRes.status === 'rejected') {
          setError(idRes.reason?.message || 'Erreur lors du chargement du client.')
        }
        if (tarRes.status === 'fulfilled') setTarifs(tarRes.value)
        if (parRes.status === 'fulfilled') setParametres(parRes.value)
        if (livRes.status === 'fulfilled') setLivraisons(livRes.value)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [num])

  /* ---------- update helpers ---------- */
  const update = (section, name, value) =>
    setValues((prev) => ({
      ...prev,
      [section]: { ...prev[section], [name]: value }
    }))

  const reset = () => {
    setCreatedCode(null)
    setIsNew(true)
    setValues(INITIAL_VALUES)
    setActiveTab('identification')
  }

  const close = () => {
    if (onCancel) onCancel()
    else navigate(-1)
  }

  /* ---------- save (POST / PUT) — stays on the page ---------- */
  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        identification: values.identification,
        coordonnees: values.coordonnees,
        telecom: values.telecom,
        immatriculation: values.immatriculation
      }

      if (isEdit) {
        const result = await updateClient(effectiveCode, payload)
        message.success('Client mis à jour')
        onSave?.(result ?? values)
      } else {
        const result = await createClient(payload)
        message.success('Client créé')

        const newCode =
          result?.identification?.compteTiers ||
          result?.compteTiers ||
          values.identification.compteTiers

        if (newCode) {
          setCreatedCode(newCode)
          setIsNew(false)
          setValues((prev) => ({
            ...prev,
            identification: { ...prev.identification, compteTiers: newCode }
          }))
        }

        onSave?.(result ?? values)
      }
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Échec de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Spin />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert type="error" showIcon message={error} />
        <div className="mt-3">
          <Button onClick={close}>Fermer</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] flex-col border-b border-solid border-gray-300 bg-white">
      {/* Content area - scrolls naturally with the page */}
      <div className="flex-1 p-3 bg-gray-100">
        <Tabs
          type="card"
          size="small"
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 0 }}
          items={[
            {
              key: 'identification',
              label: 'Identification',
              children: <IdentificationTab values={values} update={update} isEdit={isEdit} />
            },
            { key: 'contacts', label: 'Contacts', disabled: true },
            {
              key: 'tarifs',
              label: 'Tarifs',
              children: <TarifsTab tarifs={tarifs} />
            },
            {
              key: 'livraisons',
              label: 'Livraisons',
              children: <LivraisonsTab livraisons={livraisons} />
            },
            { key: 'banques', label: 'Banques', disabled: true },
            { key: 'champs', label: 'Champs libres', disabled: true },
            { key: 'solvabilite', label: 'Solvabilité', disabled: true },
            { key: 'agenda', label: 'Agenda', disabled: true },
            {
              key: 'parametres',
              label: 'Paramètres',
              children: <ParametresTab parametres={parametres} />
            }
          ]}
        />
      </div>

      {/* 
        Fixed Footer:
        - mt-auto pushes it to the bottom if content is short.
        - sticky bottom-0 keeps it pinned to the viewport when scrolling.
        - z-50 ensures it stays above the content.
      */}
      <div className="sticky bottom-0 z-50 mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-solid border-gray-300 bg-white px-3 py-2 shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
        <Button size="small" onClick={reset}>
          Nouveau
        </Button>
        <Button size="small" type="primary" loading={saving} onClick={save}>
          OK
        </Button>
        <Button size="small" onClick={close}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
