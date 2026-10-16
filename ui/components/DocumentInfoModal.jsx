import React, { useEffect, useState, useCallback } from 'react'
import { Form, Input, Select, Checkbox, DatePicker, Button, message, Spin } from 'antd'
import dayjs from 'dayjs'
import DesktopWindow from './ui/DesktopWindow'
import { api } from '../utils/api'

// ---------------------------------------------------------------------
// Constantes de mapping (alignées sur les enums C#)
// ---------------------------------------------------------------------
const LANGUE_OPTIONS = [
  { value: 'LangueTypeAucune', label: 'Aucune' },
  { value: 'LangueTypeLangue1', label: 'Langue 1' },
  { value: 'LangueTypeLangue2', label: 'Langue 2' }
]

const STATUT_LABELS = {
  DocumentStatutTypeSaisie: 'Saisi',
  DocumentStatutTypeConfirme: 'Confirmé',
  DocumentStatutTypeAPrepare: 'À préparer',
  DocumentStatutTypeDevisPerdu: 'Devis perdu',
  DocumentStatutTypeDevisArchive: 'Devis archivé'
}

const MODE_PAIEMENT_LABELS = {
  DocumentConditionPaiementTiers: 'Condition de paiement du tiers',
  DocumentConditionPaiementSaisie: 'Condition de paiement saisie',
  DocumentConditionPaiementModele: 'Condition de paiement du modèle'
}

// ---------------------------------------------------------------------
// Helper — aligne les labels et inputs
// ---------------------------------------------------------------------
const FormRow = ({ label, children }) => (
  <div className="flex items-start gap-2">
    <label className="w-32 pt-0.5 text-[13px] text-gray-700 shrink-0 whitespace-nowrap">
      {label}
    </label>
    <div className="flex-1">{children}</div>
  </div>
)

// ---------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------
export default function DocumentInfoModal({ open, onClose, documentType, piece, onSaved }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [docInfo, setDocInfo] = useState(null) // ← état du document courant

  // Lookups
  const [clients, setClients] = useState([])
  const [categorieTarif, setCategorieTarif] = useState([])
  const [depots, setDepots] = useState([])
  const [devises, setDevises] = useState([])
  const [expeditions, setExpeditions] = useState([])
  const [collaborateurs, setCollaborateurs] = useState([])
  const [unites, setUnites] = useState([])

  // ---------------------------------------------------------------------
  // Chargement des lookups
  // ---------------------------------------------------------------------
  const loadLookups = useCallback(async () => {
    try {
      const [clientsRes, catRes, depotsRes, devisesRes, expRes, collabRes, unitesRes] =
        await Promise.all([
          api.get('/clients/short'),
          api.get('/categorie-tarif'),
          api.get('/depots'),
          api.get('/devise'),
          api.get('/expeditions'),
          api.get('/collaborateurs'),
          api.get('/unite/short')
        ])

      setClients(clientsRes.data || [])
      setCategorieTarif(catRes.data || [])
      setDepots(depotsRes.data?.depots || depotsRes.data || [])
      setDevises(devisesRes.data || [])
      setExpeditions(expRes.data || [])
      setCollaborateurs(collabRes.data || [])
      setUnites(unitesRes.data || [])
    } catch (err) {
      console.error('Lookups load failed:', err)
      message.error('Impossible de charger les listes de référence.')
    }
  }, [])

  // ---------------------------------------------------------------------
  // Chargement du document
  // ---------------------------------------------------------------------
  const loadDocument = useCallback(async () => {
    if (!documentType || !piece) return
    try {
      setLoading(true)
      const { data } = await api.get(`/documents/${documentType}/${piece}/info`)

      if (!data.success) {
        message.warning(data.message || 'Document introuvable.')
        return
      }

      setDocInfo(data.document)
      hydrateForm(data.document)
    } catch (err) {
      console.error('Load document info failed:', err)
      message.error('Impossible de charger les informations du document.')
    } finally {
      setLoading(false)
    }
  }, [documentType, piece])

  // ---------------------------------------------------------------------
  // Mappe la réponse API → valeurs du formulaire
  // ---------------------------------------------------------------------
  const hydrateForm = (d) => {
    form.setFieldsValue({
      // Section 1
      depot: d.depot ?? undefined,
      contact: d.contact ?? undefined,
      codeAffaire: d.codeAffaire ?? undefined,
      langue: d.langue ?? 'LangueTypeAucune',
      devise: d.deviseCodeISO ?? undefined,
      cours: d.cours ?? 1,
      faOrigine: d.faOrigine ?? undefined,

      // Section 2
      lieuLivraison: d.lieuLivraison ?? undefined,
      modeExpedition: d.modeExpedition ?? undefined,
      conditionLivraison: d.conditionLivraison ?? undefined,
      nbCols: d.nbCols ?? 1,
      typeColisage: d.typeColisage ?? undefined,

      // Section 3
      centraleAchat: d.centraleAchat ?? undefined,
      categorieTarifaire: d.categorieTarifaire ?? undefined,
      representant: d.representant ?? undefined,
      categorieComptable: d.categorieComptable ?? undefined,
      tiersPayeur: d.tiersPayeur ?? undefined,
      compteGeneral: d.compteGeneral ?? undefined,

      // Section 4 — dates
      dateDebut: d.periodiciteDebut ? dayjs(d.periodiciteDebut) : null,
      dateFin: d.periodiciteFin ? dayjs(d.periodiciteFin) : null,

      // Section 5 — données complémentaires
      entete1: d.entete1 ?? '',
      type: d.entete2 ?? '',
      entete3: d.entete3 ?? '',
      modePaiement: d.modePaiement ?? '',
      transaction: d.transaction ?? '',
      regime: d.regime ?? '',
      nbCopies: d.nbCopiesFa ?? 1,
      periodicite: d.periodicite ?? undefined,
      caisse: d.caisse ?? undefined,
      caissier: d.caissier ?? undefined
    })
  }

  // ---------------------------------------------------------------------
  // Effets
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!open) return
    loadLookups()
    loadDocument()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentType, piece])

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      form.resetFields()
      setDocInfo(null)
    }
  }, [open, form])

  // ---------------------------------------------------------------------
  // Soumission
  // ---------------------------------------------------------------------
  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        langue: values.langue,
        categorieTarif: values.categorieTarifaire,
        depot: values.depot,
        deviseCodeISO: values.devise,
        categorieCompta: values.categorieComptable,
        withPrice: true
      }

      const { data } = await api.patch(`/documents/${documentType}/${piece}/entete`, payload)

      if (data.success) {
        message.success(data.message || 'Entête mise à jour.')
        onSaved?.(data)
        onClose?.()
      } else {
        message.warning(data.message || 'Aucune modification appliquée.')
      }
    } catch (err) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message)
      } else if (!err?.errorFields) {
        console.error('Save failed:', err)
        message.error('Erreur lors de la mise à jour.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------
  return (
    <DesktopWindow
      open={open}
      onClose={onClose}
      title={`Informations document — ${piece ?? ''}`}
      width={820}
      canClose={true}
    >
      <div className="bg-[#F4F6F1] flex flex-col h-[70vh] text-xs">
        <div className="flex-1 overflow-y-auto p-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <Spin />
            </div>
          )}

          <Form
            form={form}
            layout="vertical"
            size="small"
            initialValues={{
              langue: 'LangueTypeAucune',
              cours: '1',
              nbCols: '1',
              nbCopies: '1'
            }}
          >
            {/* ================= SECTION 1 ================= */}
            <div className="mb-3">
              <h3 className="text-[14px] font-bold text-[#37402F] border-b border-[#D2DAC4] pb-1">
                Paramètres de saisie
              </h3>
              <div className="grid grid-cols-2 gap-x-6 pt-2">
                <FormRow label="Dépôt">
                  <Form.Item name="depot" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner…"
                      options={depots.map((d) => ({
                        value: d.intitule,
                        label: d.intitule
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Contact">
                  <Form.Item name="contact" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Code Affaire">
                  <Form.Item name="codeAffaire" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Langue">
                  <Form.Item name="langue" className="mb-0">
                    <Select options={LANGUE_OPTIONS} />
                  </Form.Item>
                </FormRow>

                <FormRow label="Devise">
                  <Form.Item name="devise" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner…"
                      options={devises.map((d) => ({
                        value: d.codeISO,
                        label: `${d.codeISO} — ${d.intitule}`
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Cours">
                  <Form.Item name="cours" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="N° FA origine">
                  <Form.Item name="faOrigine" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
              </div>

              <div className="mt-2 flex flex-col gap-0.5 ml-30">
                <Checkbox className="text-[11px] text-gray-700">
                  Interdire le regroupement du document en transformation
                </Checkbox>
                <Checkbox className="text-[11px] text-gray-400">Facture rectifiée</Checkbox>
              </div>
            </div>

            {/* ================= SECTION 2 ================= */}
            <div className="mb-3 pt-2">
              <h3 className="text-[14px] font-bold text-[#37402F] border-b border-[#D2DAC4] pb-1">
                Livraison / Expédition
              </h3>
              <div className="grid grid-cols-2 gap-x-6 pt-3">
                <div className="col-span-2">
                  <FormRow label="Lieu de livraison">
                    <Form.Item name="lieuLivraison" className="mb-0">
                      <Input />
                    </Form.Item>
                  </FormRow>
                </div>

                <FormRow label="Mode d'expédition">
                  <Form.Item name="modeExpedition" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner…"
                      options={expeditions.map((e) => ({ value: e, label: e }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Condition livraison">
                  <Form.Item name="conditionLivraison" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Nb de cols">
                  <Form.Item name="nbCols" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Type de colisage">
                  <Form.Item name="typeColisage" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner…"
                      allowClear
                      options={unites.map((u) => ({
                        value: u.u_Intitule,
                        label: u.u_Intitule
                      }))}
                    />
                  </Form.Item>
                </FormRow>
              </div>
            </div>

            {/* ================= SECTION 3 ================= */}
            <div className="mb-3">
              <h3 className="text-[14px] font-bold text-[#37402F] border-b border-[#D2DAC4] pb-1">
                Tarification et Comptabilisation
              </h3>
              <div className="grid grid-cols-2 gap-x-6 pt-2">
                <FormRow label="Centrale d'achat">
                  <Form.Item name="centraleAchat" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder=""
                      allowClear
                      options={clients.map((c) => ({
                        value: c.code,
                        label: `${c.code} — ${c.intitule}`
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Catégorie tarifaire">
                  <Form.Item name="categorieTarifaire" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Sélectionner…"
                      options={categorieTarif.map((c) => ({
                        value: c.ct_Intitule,
                        label: c.ct_Intitule
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Représentant">
                  <Form.Item name="representant" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder=""
                      allowClear
                      options={collaborateurs.map((c) => ({
                        value: c.nom,
                        label: `${c.nom}${c.prenom ? ' ' + c.prenom : ''}`
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Catégorie comptable">
                  <Form.Item name="categorieComptable" className="mb-0">
                    <Select placeholder="" allowClear />
                  </Form.Item>
                </FormRow>

                <FormRow label="Tiers payeur">
                  <Form.Item name="tiersPayeur" className="mb-0">
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder=""
                      options={clients.map((c) => ({
                        value: c.code,
                        label: `${c.code} — ${c.intitule}`
                      }))}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Compte général">
                  <Form.Item name="compteGeneral" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
              </div>
            </div>

            {/* ================= SECTION 4 ================= */}
            <div className="mb-3">
              <h3 className="text-[14px] font-bold text-[#37402F] border-b border-[#D2DAC4] pb-1">
                Abonnement
              </h3>
              <div className="grid grid-cols-2 gap-x-6 pt-2">
                <FormRow label="Début périodicité">
                  <Form.Item name="dateDebut" className="mb-0">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Date fin périodicité">
                  <Form.Item name="dateFin" className="mb-0">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </FormRow>
              </div>
            </div>

            {/* ================= SECTION 5 ================= */}
            <div className="mb-2">
              <h3 className="text-[14px] font-bold text-[#37402F] border-b border-[#D2DAC4] pb-1">
                Données complémentaires
              </h3>
              <div className="grid grid-cols-2 gap-x-6 pt-2">
                <FormRow label="Entête 1">
                  <Form.Item name="entete1" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
                <FormRow label="TYPE">
                  <Form.Item name="type" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Entête 3">
                  <Form.Item name="entete3" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
                <FormRow label="MODE DE PAIEMENT">
                  <Form.Item name="modePaiement" className="mb-0">
                    <Select
                      allowClear
                      options={[
                        { value: 'DocumentConditionPaiementTiers', label: 'Condition du tiers' },
                        { value: 'DocumentConditionPaiementSaisie', label: 'Condition saisie' },
                        { value: 'DocumentConditionPaiementModele', label: 'Condition du modèle' }
                      ]}
                    />
                  </Form.Item>
                </FormRow>

                <FormRow label="Transaction">
                  <Form.Item name="transaction" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
                <FormRow label="Regime">
                  <Form.Item name="regime" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Nb de copies FA">
                  <Form.Item name="nbCopies" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>
                <FormRow label="Périodicité">
                  <Form.Item name="periodicite" className="mb-0">
                    <Input />
                  </Form.Item>
                </FormRow>

                <FormRow label="Caisse">
                  <Form.Item name="caisse" className="mb-0">
                    <Input disabled />
                  </Form.Item>
                </FormRow>
                <FormRow label="Caissier">
                  <Form.Item name="caissier" className="mb-0">
                    <Input disabled />
                  </Form.Item>
                </FormRow>
              </div>
            </div>
          </Form>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 flex justify-end gap-2 shrink-0">
          <Button
            type="primary"
            size="small"
            className="px-6 bg-blue-600"
            onClick={handleOk}
            loading={saving}
            disabled={loading || docInfo?.isCloture}
          >
            OK
          </Button>
          <Button size="small" className="px-4" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
        </div>
      </div>
    </DesktopWindow>
  )
}
