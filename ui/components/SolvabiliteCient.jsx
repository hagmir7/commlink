import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Empty, Spin, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import DesktopWindow from './ui/DesktopWindow'

// ---------------------------------------------------------------------------
// Formatting helpers (mirror Sage's display)
// ---------------------------------------------------------------------------
const fmtAmount = (v) =>
  (Number(v) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const fmtDate = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

// ---------------------------------------------------------------------------
// One label/value row, optionally with a right-aligned numeric value
// ---------------------------------------------------------------------------
function Row({ label, value, bold, isAmount, isDate, highlight }) {
  const display = isAmount ? fmtAmount(value) : isDate ? fmtDate(value) : value

  return (
    <div
      className={`flex items-center justify-between px-2 py-[2px] text-[13px] ${
        highlight ? 'bg-white' : 'bg-[#eef2f7]'
      }`}
    >
      <span className="text-[#2f3a4a]">{label}</span>
      <span
        className={`text-right tabular-nums ${
          bold ? 'font-semibold text-[#1e3a8a]' : 'text-[#2f3a4a]'
        }`}
      >
        {display}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// A titled group of rows, wrapped in a rounded border
// ---------------------------------------------------------------------------
function Group({ children, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#7c9cc4] bg-[#eef2f7] ${className}`}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SolvabiliteCient({ open, onClose, clientCode = 'CL577' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const url = `/clients/${clientCode}/solvabilite`

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(url)
      setData(data)
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || 'Impossible de charger la solvabilité.'
      )
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  const actionLabel =
    data?.codeRisqueAction === 'RisqueTypeLivrer'
      ? 'A livrer'
      : data?.codeRisqueAction === 'RisqueTypeBloquer'
        ? 'A bloquer'
        : data?.codeRisqueAction === 'RisqueTypeSurveiller'
          ? 'A surveiller'
          : (data?.codeRisqueAction ?? '')

  return (
    <DesktopWindow
      open={open}
      onClose={onClose}
      width={460}
      bodyClassName="px-4 py-3 bg-[#f7f9fc]"
      title={`Solvabilité : ${clientCode}`}
    >
      {loading && (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      )}

      {!loading && error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>
              Réessayer
            </Button>
          }
        />
      )}

      {!loading && !error && !data && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune donnée" />
      )}

      {!loading && !error && data && (
        <>
          {/* -------- Informations sur le code risque -------- */}
          <div className="mb-4">
            <div className="mb-2 text-[14px] text-[#1e3a8a]">Informations sur le code risque</div>

            <div className="mb-2 grid grid-cols-[140px_1fr] items-center gap-2">
              <span className="text-right text-[13px] text-[#4a5568]">Code risque</span>
              <div className="rounded-[3px] border border-[#7c9cc4] bg-white px-2 py-[3px] text-[13px] text-[#2f3a4a]">
                {actionLabel} {Math.round(data.encoursAutorise)}
              </div>
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-2">
              <span className="text-right text-[13px] text-[#4a5568]">Action</span>
              <span className="text-[13px] text-[#2f3a4a]">{actionLabel}</span>
            </div>
          </div>

          {/* -------- Calcul de l'encours -------- */}
          <div className="mt-4">
            <div className="mb-2 text-[14px] text-[#1e3a8a]">Calcul de l'encours</div>

            <div className="flex flex-col gap-3">
              <Group>
                <Row label="Encours autorisé" isAmount value={data.encoursAutorise} />
                <Row
                  label={`Solde comptable au ${fmtDate(new Date())}`}
                  isAmount
                  value={data.soldeComptable}
                />
                <Row label="Dont solde échu à 30 jours" isAmount value={data.soldeEchu30Jours} />
                <Row label="Dont solde échu à 60 jours" isAmount value={data.soldeEchu60Jours} />
                <Row label="Dont solde échu à 90 jours" isAmount value={data.soldeEchu90Jours} />
                <Row label="Dont solde non échu" isAmount value={data.soldeNonEchu} />
              </Group>

              <Group>
                <Row label="Dépassement" isAmount bold value={data.depassement} />
              </Group>

              <Group>
                <Row label="Portefeuille BL & FA" isAmount value={data.portefeuilleBLFA} />
                <Row label="Portefeuille règlements" isAmount value={data.portefeuilleReglements} />
              </Group>

              <Group>
                <Row label="Dépassement" isAmount bold value={data.depassement2} />
              </Group>

              <Group>
                <Row label="Assurance crédit" isAmount value={data.assuranceCredit} />
              </Group>

              <Group>
                <Row label="Risque réel" isAmount bold value={data.risqueReel} />
              </Group>

              <Group>
                <Row label="Portefeuille BC & PL" isAmount value={data.portefeuilleBCPL} />
              </Group>

              <Group>
                <Row label="Date dernière facture" isDate value={data.derniereFacture} />
                <Row label="Date dernier règlement" isDate value={data.dernierReglement} />
              </Group>
            </div>
          </div>

          {/* -------- Footer buttons -------- */}
          <div className="pt-4 flex items-center justify-end gap-2">
            <Button size="small" type="primary" onClick={onClose}>
              OK
            </Button>
            <Button size="small" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </>
      )}
    </DesktopWindow>
  )
}
