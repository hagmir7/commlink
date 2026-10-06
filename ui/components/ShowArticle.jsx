import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, Input, Menu, Select, Spin, Tabs } from 'antd'
import { getArticle } from '../api/article'
import BackButton from './BackButton'

const SUIVI_STOCK = { 0: 'Aucun', 1: 'CMUP' } // add other Sage values if needed

const fmt = (v) => (v === null || v === undefined ? '' : String(v))
const fmtMoney = (v) =>
  v == null || v === ''
    ? ''
    : new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(v))

/* ---------- building blocks ---------- */

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="m-0 text-lg font-normal text-gray-700">{children}</h3>
      <div className="flex-1 border-0 border-b border-solid border-gray-300" />
    </div>
  )
}

function Label({ children, disabled }) {
  return (
    <label
      className={`text-right text-[13px] leading-tight ${
        disabled ? 'text-gray-400' : 'text-gray-800'
      }`}
    >
      {children}
    </label>
  )
}

// one row = label cell + control cell(s)
function Row({ label, value, disabled, bold, combo, span = 1 }) {
  return (
    <>
      <Label disabled={disabled}>{label}</Label>
      <div style={{ gridColumn: `span ${span}` }} className="min-w-0">
        {combo ? (
          <Select
            open={false}
            disabled={disabled}
            value={value || undefined}
            options={value ? [{ value, label: value }] : []}
            className="w-full"
          />
        ) : (
          <Input
            readOnly
            disabled={disabled}
            value={value}
            className={bold ? 'font-semibold' : ''}
          />
        )}
      </div>
    </>
  )
}

// "Prix de vente" + small "PV HT" combo
function PriceRow({ label, value, unit }) {
  return (
    <>
      <Label>{label}</Label>
      <div className="flex min-w-0">
        <Input readOnly value={value} className="flex-1 min-w-0" />
        <Select
          open={false}
          value={unit}
          options={[{ value: unit, label: unit }]}
          className="!w-24 shrink-0"
        />
      </div>
    </>
  )
}

// 4 columns: label | input | label | input
const Grid4 = ({ children }) => (
  <div className="grid grid-cols-[130px_minmax(0,1fr)_150px_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
    {children}
  </div>
)

// 2 columns: label | input
const Grid2 = ({ children, label = 120 }) => (
  <div
    className="grid gap-x-3 gap-y-2 items-center"
    style={{ gridTemplateColumns: `${label}px minmax(0,1fr)` }}
  >
    {children}
  </div>
)

const Panel = ({ children }) => (
  <div className="bg-white border border-solid border-gray-300 p-5">{children}</div>
)

/* ---------- tab contents ---------- */

function IdentificationTab({ a }) {
  return (
    <Panel className="border-t-0">
      <div className="flex flex-col gap-8">
        <section>
          <SectionTitle>Identification</SectionTitle>
          <Grid4>
            <Row label="Référence" value={fmt(a.ref)} disabled />
            <Row label="Type" value={fmt(a.type) || 'Standard'} disabled combo />

            <Row label="Désignation" value={fmt(a.designation)} bold span={3} />

            <Row label="Famille" value={fmt(a.famille)} combo />
            <Row label="Nomenclature" value={fmt(a.nomenclature) || 'Aucune'} combo />

            <Row
              label="Suivi de stock"
              value={SUIVI_STOCK[a.suiviStock] ?? fmt(a.suiviStock)}
              disabled
              combo
            />
            <Row label="Conditionnement" value={fmt(a.conditionnement) || 'Aucun'} combo />
          </Grid4>
        </section>

        <section>
          <SectionTitle>Tarif</SectionTitle>
          <Grid4>
            <Row label="Prix d'achat" value={fmtMoney(a.prixAchat)} />
            <Row label="Dernier Prix d'achat" value={fmtMoney(a.dernierPrixAchat)} />

            <Row label="Coefficient" value={fmt(a.coef)} />
            <Row label="Coût standard" value={fmtMoney(a.coutStandard)} />

            <PriceRow label="Prix de vente" value={fmtMoney(a.prixVente)} unit="PV HT" />
            <Row label="Unité de vente" value={fmt(a.uniteVente) || 'Unité'} combo />
          </Grid4>
        </section>
      </div>
    </Panel>
  )
}

function ChampsLibresTab({ a }) {
  const [side, setSide] = useState('infos')

  return (
    <Panel>
      <div className="flex gap-3">
        <Menu
          mode="inline"
          selectedKeys={[side]}
          onClick={({ key }) => setSide(key)}
          style={{ padding: '0' }}
          styles={{ item: { padding: '0 12px', height: '36px' } }}
          items={[
            { key: 'infos', label: 'Informations libres' },
            { key: 'docs', label: 'Documents attachés' },
            { key: 'photo', label: 'Photo' }
          ]}
          className="!w-48 shrink-0 self-start min-h-[360px] !border !border-solid !border-gray-300"
        />

        <div className="flex-1 min-w-0 border border-solid border-gray-300 p-4">
          {side === 'infos' ? (
            <>
              <SectionTitle>Informations libres</SectionTitle>
              <Grid2 label={110}>
                <Row label="Nom" value={fmt(a.nom)} />
                <Row label="Hauteur" value={fmt(a.hauteur)} />
                <Row label="Largeur" value={fmt(a.largeur)} />
                <Row label="Profondeur" value={fmt(a.profondeur)} />
                <Row label="Longueur" value={fmt(a.longueur)} />
                <Row label="Couleur" value={fmt(a.couleur)} />
                <Row label="Chant" value={fmt(a.chant)} />
                <Row label="Episseur" value={fmt(a.episseur)} />
                <Row label="Description" value={fmt(a.description)} />
              </Grid2>
            </>
          ) : (
            <p className="m-0 text-sm text-gray-400">Non disponible</p>
          )}
        </div>
      </div>
    </Panel>
  )
}

function ParametresTab({ a }) {
  return (
    <Panel>
      <SectionTitle>Paramètres</SectionTitle>
      <Grid4>
        <Row label="Code barre" value={fmt(a.codeBarre)} />
        <Row label="Code EDI" value={fmt(a.ediCode)} />
        <Row label="Poids net" value={fmt(a.poidsNet)} />
        <Row label="Poids brut" value={fmt(a.poidsBrut)} />
        <Row label="Unité de poids" value={fmt(a.unitePoids)} />
        <Row label="Prix TTC" value={fmtMoney(a.prixTTC)} />
        <Row label="Sommeil" value={a.sommeil ? 'Oui' : 'Non'} />
      </Grid4>
    </Panel>
  )
}

/* ---------- page ---------- */

export default function ShowArticle() {
  const { ref } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getArticle(ref)
        if (!cancelled) setArticle(data)
      } catch (err) {
        if (!cancelled) {
          setArticle(null)
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [ref])

  if (loading) return <Spin className="block mt-10" />
  if (error) return <Alert type="error" showIcon message={error} />
  if (!article) return null

  document.getElementById('window-title').textContent =
    `Article : ${article.ref} ${article.designation}`

  return (
    <div className=" mx-auto border-b border-solid border-gray-300 bg-white">
      {/* <div className="px-4 py-3 text-center text-base text-gray-800 border-0 border-b border-solid border-gray-200">
          Article : {article.ref} {article.designation}
        </div> */}
      <BackButton />
      <div className="p-3 bg-gray-100">
        <Tabs
          type="card"
          size="small"
          tabBarStyle={{ marginBottom: 0 }}
          items={[
            {
              key: 'identification',
              label: 'Identification',
              children: <IdentificationTab a={article} />
            },
            { key: 'descriptif', label: 'Descriptif', disabled: true },
            { key: 'champs', label: 'Champs Libres', children: <ChampsLibresTab a={article} /> },
            { key: 'parametres', label: 'Paramètres', children: <ParametresTab a={article} /> }
          ]}
        />
      </div>
    </div>
  )
}
