import React from 'react'
import { Checkbox, DatePicker, Input, InputNumber, Select } from 'antd'
import { Panel, Section, Empty, Label } from './primitives'
import dayjs from 'dayjs' // antd v5 uses dayjs for DatePicker

// Custom grid to match the wider labels in the screenshot
const GridParams = ({ children }) => (
  <div className="grid grid-cols-[180px_minmax(0,1fr)_150px_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
    {children}
  </div>
)

export default function ParametresTab({ parametres }) {
  if (!parametres)
    return (
      <Panel>
        <Empty />
      </Panel>
    )

  const s = parametres.saisieDocument || {}
  const p = parametres.periodeFermeture || {}
  const c = parametres.comptabilite || {}

  return (
    <Panel>
      {/* ---------------- Saisie de document ---------------- */}
      <Section title="Saisie de document" />
      <GridParams>
        {/* Row 1 */}
        <Label>Dépôt de rattachement</Label>
        <Select
          size="small"
          value={s.depotIntitule || 'Dépôt principal'}
          options={[{ value: 'Dépôt principal', label: 'Dépôt principal' }]}
          style={{ height: 24, fontSize: 13 }}
        />

        <Label>Code affaire</Label>
        <Select
          size="small"
          value={s.codeAffaire || undefined}
          options={[]}
          style={{ height: 24, fontSize: 13 }}
        />

        {/* Row 2 */}
        <Label>Devise</Label>
        <Select
          size="small"
          value={s.deviseIntitule || 'MAD'}
          options={[{ value: 'MAD', label: 'MAD' }]}
          style={{ height: 24, fontSize: 13 }}
        />

        <Label>Langue</Label>
        <Select
          size="small"
          disabled
          value={s.langueLabel || 'Aucune'}
          options={[{ value: 'Aucune', label: 'Aucune' }]}
          style={{ height: 24, fontSize: 13 }}
        />

        {/* Row 3 */}
        <Label>Périodicité</Label>
        <Select
          size="small"
          disabled
          value={s.periodiciteCode}
          options={[]}
          style={{ height: 24, fontSize: 13 }}
        />

        <Label>Priorité livraison</Label>
        <InputNumber
          size="small"
          value={s.prioriteLivraison ?? 0}
          className="w-full"
          style={{ fontSize: 13, width: '100%' }}
        />

        {/* Row 4 */}
        <div className="text-right text-[13px] leading-tight text-gray-800 flex items-center justify-end gap-1">
          Raccourci <span className="text-[10px]">↥</span>
        </div>
        <Input size="small" value={s.raccourci || ''} style={{ fontSize: 13 }} />

        <Label>Délai de transport</Label>
        <InputNumber
          size="small"
          value={s.delaiTransport ?? 0}
          className="w-full"
          style={{ fontSize: 13, width: '100%' }}
        />

        {/* Row 5 */}
        <Label>Code EDI</Label>
        <Input size="small" value={s.codeEDI || ''} style={{ fontSize: 13 }} />
        <div />
        <div />
      </GridParams>

      {/* Checkboxes grouped in 2 columns */}
      <div className="grid py-4 gap-x-3 mt-3 px-12">
        <div />
        <div className="flex flex-col gap-1.5">
          <Checkbox checked={s.factureParBonLivraison} className="text-[13px]">
            Etablir une facture par bon de livraison
          </Checkbox>
          <Checkbox checked={s.autoriserLivraisonPartielle} className="text-[13px]">
            Autoriser la livraison partielle
          </Checkbox>
          <Checkbox checked={s.mettreEnSommeil} className="text-[13px]">
            Mettre en sommeil
          </Checkbox>
        </div>
        <div />
        <div className="flex flex-col gap-1.5">
          <Checkbox checked={s.exclureMarketing} className="text-[13px]">
            Exclure des traitements à des fins marketing
          </Checkbox>
        </div>
      </div>

      {/* ---------------- Période de fermeture ---------------- */}
      <Section title="Période de fermeture" />
      <GridParams>
        <Label>Date début</Label>
        <DatePicker
          size="small"
          value={p.dateDebut ? dayjs(p.dateDebut) : null}
          format="DD/MM/YYYY"
          className="w-full"
          style={{ height: 24, fontSize: 13 }}
        />

        <Label>Date fin</Label>
        <DatePicker
          size="small"
          value={p.dateFin ? dayjs(p.dateFin) : null}
          format="DD/MM/YYYY"
          className="w-full"
          style={{ height: 24, fontSize: 13 }}
        />
      </GridParams>

      {/* ---------------- Comptabilité ---------------- */}
      <Section title="Comptabilité" />
      <GridParams>
        <Label>Catégorie comptable</Label>
        <Select
          size="small"
          value={c.categorieComptableIntitule || 'VENTE AU MAROC'}
          options={[{ value: 'VENTE AU MAROC', label: 'VENTE AU MAROC' }]}
          style={{ height: 24, fontSize: 13 }}
        />
        <div />
        <div />
      </GridParams>
    </Panel>
  )
}
