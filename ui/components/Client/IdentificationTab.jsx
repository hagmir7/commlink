import React from 'react'
import { Checkbox } from 'antd'
import { Row, Grid4, Panel, Section, Label } from './primitives'

const COMPTES_COLLECTIFS = [
  { value: '34210000', label: '34210000' },
  { value: '34110000', label: '34110000' }
]

const PAYS = [
  { value: 'Maroc', label: 'Maroc' },
  { value: 'France', label: 'France' },
  { value: 'Espagne', label: 'Espagne' }
]

export default function IdentificationTab({ values, update, isEdit }) {
  const id = values.identification
  const co = values.coordonnees
  const te = values.telecom
  const im = values.immatriculation

  const setId = (k, v) => update('identification', k, v)
  const setCo = (k, v) => update('coordonnees', k, v)
  const setTe = (k, v) => update('telecom', k, v)
  const setIm = (k, v) => update('immatriculation', k, v)

  return (
    <Panel>
      {/* ---------- Identification ---------- */}
      <Section title="Identification" />
      <Grid4>
        <Row
          label="Compte tiers"
          value={id.compteTiers}
          onChange={(v) => setId('compteTiers', v)}
          disabled={isEdit}
        />
        <div className="flex items-center" style={{ gridColumn: 'span 2' }}>
          <Checkbox
            checked={!!id.prospect}
            onChange={(e) => setId('prospect', e.target.checked)}
            className="text-[13px] text-gray-700"
          >
            Gérer en tant que prospect
          </Checkbox>
        </div>

        <Row label="Intitulé" value={id.intitule} onChange={(v) => setId('intitule', v)} span={3} />

        <Row label="Abrégé" value={id.abrege} onChange={(v) => setId('abrege', v)} />
        <Row label="Qualité" value={id.qualite} onChange={(v) => setId('qualite', v)} autoFocus />

        <Row
          label="Compte collectif"
          value={id.compteCollectif}
          onChange={(v) => setId('compteCollectif', v)}
          combo
          options={COMPTES_COLLECTIFS}
        />
        <Row
          label="Interlocuteur"
          value={id.interlocuteur}
          onChange={(v) => setId('interlocuteur', v)}
        />

        <Row
          label="Commentaire"
          value={id.commentaire}
          onChange={(v) => setId('commentaire', v)}
          span={3}
        />
      </Grid4>

      {/* ---------- Coordonnées ---------- */}
      <Section title="Coordonnées" />
      <Grid4>
        <Row label="Adresse" value={co.adresse} onChange={(v) => setCo('adresse', v)} span={3} />
        <Row
          label="Complément"
          value={co.complement}
          onChange={(v) => setCo('complement', v)}
          span={3}
        />
        <Row label="Code postal" value={co.codePostal} onChange={(v) => setCo('codePostal', v)} />
        <Row label="Ville" value={co.ville} onChange={(v) => setCo('ville', v)} />
        <Row label="Région" value={co.region} onChange={(v) => setCo('region', v)} />
        <Row label="Pays" value={co.pays} onChange={(v) => setCo('pays', v)} combo options={PAYS} />
      </Grid4>

      {/* ---------- Télécommunication ---------- */}
      <Section title="Télécommunication" />
      <Grid4>
        <Row label="Téléphone" value={te.telephone} onChange={(v) => setTe('telephone', v)} />
        <Row label="Télécopie" value={te.telecopie} onChange={(v) => setTe('telecopie', v)} />

        <Row label="LinkedIn" value={te.linkedIn} onChange={(v) => setTe('linkedIn', v)} />
        <Row label="Facebook" value={te.facebook} onChange={(v) => setTe('facebook', v)} />

        <Row label="E-mail" value={te.email} onChange={(v) => setTe('email', v)} span={3} />
        <Row
          label="Site internet"
          value={te.siteInternet}
          onChange={(v) => setTe('siteInternet', v)}
          span={3}
        />
      </Grid4>

      {/* ---------- Immatriculation ---------- */}
      <Section title="Immatriculation" />
      <Grid4>
        <Row label="Siret" value={im.siret} onChange={(v) => setIm('siret', v)} />
        <Row label="Code NAF" value={im.codeNaf} onChange={(v) => setIm('codeNaf', v)} />
        <Row
          label="Identifiant TVA"
          value={im.identifiantTva}
          onChange={(v) => setIm('identifiantTva', v)}
        />
      </Grid4>
    </Panel>
  )
}
