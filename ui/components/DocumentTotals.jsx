export default function DocumentTotals({ document }) {
  const formatNumber = (value) => {
    return Number(value ?? 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <div className="shrink-0 grid grid-cols-2 bg-[#eaf1fb] border-b border-gray-300">
      <div className="px-3 py-2 border-r border-gray-300">
        <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
          <span>Poids net</span>
          <span>{formatNumber(document?.poidsNet)}</span>
        </div>

        <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
          <span>Poids brut</span>
          <span>{formatNumber(document?.poidsBrut)}</span>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
          <span>Total HT</span>
          <span>{formatNumber(document?.totalHT)}</span>
        </div>

        <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
          <span>Total TTC devise</span>
          <span>{formatNumber(document?.totalTTC)}</span>
        </div>
      </div>
    </div>
  )
}
