import { useEffect, useState } from 'react'
import { Row, Col, Typography, Spin, Alert, Tag } from 'antd'
import { api } from '../utils/api'

const { Text } = Typography

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const Line = ({ label, value, highlight = false, muted = false }) => (
  <div className="flex justify-between max-w-xs">
    <Text className={`text-[12px] ${muted ? 'text-gray-400' : 'text-gray-600'}`}>{label}</Text>
    <Text
      className={`text-[12px] font-medium ${
        highlight ? 'text-blue-700' : Number(value) < 0 ? 'text-red-600' : 'text-gray-800'
      }`}
    >
      {formatNumber(value)}
    </Text>
  </div>
)

export default function DocumentArticleStock({ refArticle }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!refArticle) {
      setData(null)
      return
    }

    let cancelled = false

    const fetchStock = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`articles/${encodeURIComponent(refArticle)}/stock`)
        const body = res?.data ?? res
        const payload = body?.data ?? body?.result ?? body

        let stocks = []
        if (Array.isArray(payload)) stocks = payload
        else if (Array.isArray(payload?.stocks)) stocks = payload.stocks
        else if (payload && 'qteStock' in payload) stocks = [payload]

        if (!cancelled) {
          setData({
            articleRef: payload?.articleRef ?? refArticle,
            designation: payload?.designation ?? '',
            stocks
          })
        }
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError("Impossible de charger le stock de l'article.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStock()
    return () => {
      cancelled = true
    }
  }, [refArticle])

  if (error) {
    return <Alert type="error" showIcon message={error} className="!text-xs" />
  }

  const stocks = data?.stocks ?? []

  // =====================================================================
  // Agrégation de tous les dépôts
  // =====================================================================
  const totals = stocks.reduce(
    (acc, s) => ({
      qteStock: acc.qteStock + Number(s.qteStock ?? 0),
      qteReservee: acc.qteReservee + Number(s.qteReservee ?? 0),
      qteCommandee: acc.qteCommandee + Number(s.qteCommandee ?? 0),
      qtePreparee: acc.qtePreparee + Number(s.qtePreparee ?? 0),
      qteAControler: acc.qteAControler + Number(s.qteAControler ?? 0),
      stockMin: acc.stockMin + Number(s.stockMin ?? 0),
      stockMax: acc.stockMax + Number(s.stockMax ?? 0)
    }),
    {
      qteStock: 0,
      qteReservee: 0,
      qteCommandee: 0,
      qtePreparee: 0,
      qteAControler: 0,
      stockMin: 0,
      stockMax: 0
    }
  )

  const stockDisponible = totals.qteStock - totals.qtePreparee
  const stockATerme =
    totals.qteStock + totals.qteCommandee - totals.qteReservee - totals.qtePreparee

  const hasPrepare = totals.qtePreparee !== 0
  const hasControl = totals.qteAControler > 0

  return (
    <Spin spinning={loading}>
      <div className="shrink-0 bg-[#eaf1fb] border border-gray-300 rounded-lg overflow-hidden">
        {/* ---- Totaux agrégés : 3 colonnes ---- */}
        <Row>
          {/* Col 1 – État physique */}
          <Col
            xs={24}
            md={8}
            className="px-3 py-2 space-y-1 border-b md:border-b-0 md:border-r border-gray-300"
          >
            <Line label="Stock réel" value={totals.qteStock} />
            <Line label="Disponible" value={stockDisponible} highlight />
            <Line label="Stock à terme" value={stockATerme} highlight />
          </Col>

          {/* Col 2 – Mouvements */}
          <Col
            xs={24}
            md={8}
            className="px-3 py-2 space-y-1 border-b md:border-b-0 md:border-r border-gray-300"
          >
            <Line label="Réservé" value={totals.qteReservee} />
            <Line label="Commandé" value={totals.qteCommandee} />
            {hasPrepare && <Line label="Préparé" value={totals.qtePreparee} />}
            {hasControl && <Line label="À contrôler" value={totals.qteAControler} />}
          </Col>

          {/* Col 3 – Seuils */}
          <Col xs={24} md={8} className="px-3 py-2 space-y-1">
            <Line label="Stock mini" value={totals.stockMin} muted />
            <Line label="Stock maxi" value={totals.stockMax} muted />
          </Col>
        </Row>
      </div>
    </Spin>
  )
}
