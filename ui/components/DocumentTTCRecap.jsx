/* eslint-disable react/prop-types */
import { Divider } from 'antd'

const formatMoney = (value) =>
  Number(value ?? 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

export default function DocumentTTCRecap({ entete }) {
  if (!entete) return null
  return (
    <>
      <Divider orientation="left" plain>
        Récapitulation TTC
      </Divider>
      <div className="flex justify-end">
        <div className="w-full rounded-md border border-[#cce0f5] bg-[#eef5fb] p-3 sm:w-[300px]">
          {[
            ['Total HT', entete.do_TotalHT],
            ['Total HT Net', entete.do_TotalHTNet],
            ['Valorisation', entete.do_TotalTTC]
          ].map(([label, value]) => (
            <div key={label} className="mb-1.5 flex justify-between text-gray-700">
              <span>{label}</span>
              <span>{formatMoney(value)}</span>
            </div>
          ))}
          <div className="mb-1.5 flex justify-between text-gray-700">
            <span>Ecart</span>
            <span />
          </div>
          <Divider className="!my-2 !border-[#cce0f5]" />
          <div className="flex justify-between font-medium text-gray-800">
            <span>Total TTC</span>
            <span>{formatMoney(entete.do_TotalTTC)}</span>
          </div>
        </div>
      </div>
    </>
  )
}
