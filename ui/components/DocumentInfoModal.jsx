import React from 'react'
import { Form, Input, Select, Checkbox, DatePicker, Button } from 'antd'
import DesktopWindow from './ui/DesktopWindow'
// import DesktopWindow from './DesktopWindow'

// Helper to perfectly align labels and inputs, matching the dense desktop look

// Tiers payeur => /clients/short
// Langue => { LangueTypeAucune, LangueTypeLangue1, LangueTypeLangue2 }
// Catégorie tarifaire
// Catégorie comptable
// Compte général
// Depots => /depots
// Devise => /devise
// Mode d'expédition => /expidition
// Type de colisage
// Centrale d'achat => /clients/short
// Représentant => /collaborateurs
// Expeditions => /expeditions

const FormRow = ({ label, children }) => (
  <div className="flex items-start gap-2">
    <label className="w-32 pt-0.5 text-[13px] text-gray-700 shrink-0 whitespace-nowrap">
      {label}
    </label>
    <div className="flex-1">{children}</div>
  </div>
)

export default function DocumentInfoModal({ open, onClose }) {
  const [form] = Form.useForm()

  return (
    <DesktopWindow
      open={open}
      onClose={onClose}
      title="Informations document"
      width={820}
      canClose={true}
    >
      <div className="bg-[#F4F6F1] flex flex-col h-[70vh] text-xs">
        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <Form
            form={form}
            layout="vertical"
            size="small"
            initialValues={{
              depot: 'STILEMOBILI',
              devise: 'MAD',
              cours: '1',
              langue: 'Aucune',
              lieuLivraison: 'INTER COCINA 62000 Nador',
              modeExpedition: 'EX-WORK',
              nbCols: '1',
              typeColisage: 'Unité',
              categorieTarifaire: 'Standard',
              categorieComptable: 'VENTE AU MAROC',
              tiersPayeur: 'CL022',
              compteGeneral: '34210000',
              entete1: '9 355.63',
              transaction: '11',
              regime: '21',
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
                    <Select options={[{ value: 'STILEMOBILI', label: 'STILEMOBILI' }]} />
                  </Form.Item>
                </FormRow>
                <FormRow label="Contact">
                  <Form.Item name="contact" className="mb-0">
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>

                <FormRow label="Code Affaire">
                  <Form.Item name="codeAffaire" className="mb-0">
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Langue">
                  <Form.Item name="langue" className="mb-0">
                    <Select options={[{ value: 'Aucune', label: 'Aucune' }]} />
                  </Form.Item>
                </FormRow>

                <FormRow label="Devise">
                  <Form.Item name="devise" className="mb-0">
                    <Select disabled options={[{ value: 'MAD', label: 'MAD' }]} />
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
                      <Select
                        options={[
                          { value: 'INTER COCINA 62000 Nador', label: 'INTER COCINA 62000 Nador' }
                        ]}
                      />
                    </Form.Item>
                  </FormRow>
                </div>

                <FormRow label="Mode d'expédition">
                  <Form.Item name="modeExpedition" className="mb-0">
                    <Select options={[{ value: 'EX-WORK', label: 'EX-WORK' }]} />
                  </Form.Item>
                </FormRow>
                <FormRow label="Condition livraison">
                  <Form.Item name="conditionLivraison" className="mb-0">
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>

                <FormRow label="Nb de cols">
                  <Form.Item name="nbCols" className="mb-0">
                    {/* Replicating the focused blue border from the image */}
                    <Input className="border-blue-500 hover:border-blue-500 focus:border-blue-500" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Type de colisage">
                  <Form.Item name="typeColisage" className="mb-0">
                    <Select disabled options={[{ value: 'Unité', label: 'Unité' }]} />
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
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Catégorie tarifaire">
                  <Form.Item name="categorieTarifaire" className="mb-0">
                    <Select options={[{ value: 'Standard', label: 'Standard' }]} />
                  </Form.Item>
                </FormRow>

                <FormRow label="Représentant">
                  <Form.Item name="representant" className="mb-0">
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Catégorie comptable">
                  <Form.Item name="categorieComptable" className="mb-0">
                    <Select options={[{ value: 'VENTE AU MAROC', label: 'VENTE AU MAROC' }]} />
                  </Form.Item>
                </FormRow>

                <FormRow label="Tiers payeur">
                  <Form.Item name="tiersPayeur" className="mb-0">
                    <Select options={[{ value: 'CL022', label: 'CL022' }]} />
                  </Form.Item>
                </FormRow>
                <FormRow label="Compte général">
                  <Form.Item name="compteGeneral" className="mb-0">
                    <Select options={[{ value: '34210000', label: '34210000' }]} />
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
                    <DatePicker className="w-full" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Date fin périodicité">
                  <Form.Item name="dateFin" className="mb-0">
                    <DatePicker className="w-full" />
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
                    <Input />
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
                    <Select placeholder="" />
                  </Form.Item>
                </FormRow>

                <FormRow label="Caisse">
                  <Form.Item name="caisse" className="mb-0">
                    <Select disabled placeholder="" />
                  </Form.Item>
                </FormRow>
                <FormRow label="Caissier">
                  <Form.Item name="caissier" className="mb-0">
                    <Select disabled placeholder="" />
                  </Form.Item>
                </FormRow>
              </div>
            </div>
          </Form>
        </div>

        {/* Sticky Footer */}
        <div className="p-3 flex justify-end gap-2 shrink-0">
          <Button type="primary" size="small" className="px-6 bg-blue-600">
            OK
          </Button>
          <Button size="small" className="px-4" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </DesktopWindow>
  )
}
