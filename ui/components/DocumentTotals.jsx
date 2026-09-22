import { Row, Col, Typography } from 'antd'

const { Text } = Typography

export default function DocumentTotals({ document }) {
  const formatNumber = (value) => {
    return Number(value ?? 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const Line = ({ label, value }) => (
    <div className="flex justify-between max-w-xs">
      <Text className="text-[12px] text-gray-600">{label}</Text>
      <Text className="text-[12px] text-gray-800 font-medium">{formatNumber(value)}</Text>
    </div>
  )

  return (
    <div className="shrink-0 bg-[#eaf1fb] border border-gray-300 rounded-lg overflow-hidden">
      <Row>
        <Col span={12} className="px-3 py-2 border-r border-gray-300 space-y-1">
          <Line label="Poids net" value={document?.poidsNet} />
          <Line label="Poids brut" value={document?.poidsBrut} />
        </Col>

        <Col span={12} className="px-3 py-2 space-y-1">
          <Line label="Total HT" value={document?.totalHT} />
          <Line label="Total TTC devise" value={document?.totalTTC} />
        </Col>
      </Row>
    </div>
  )
}
