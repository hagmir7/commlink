import React from 'react'

export default function DocumentTotals() {
  return (

      <div className="shrink-0 grid grid-cols-2 bg-[#eaf1fb] border-b border-gray-300">
           {/* Totals — fixed at the bottom of the window (outside the
          scrolling flex-1 table area above), always visible. */}
        <div className="px-3 py-2 border-r border-gray-300">
          <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
            <span>Poids net</span>
            <span>0</span>
          </div>
          <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
            <span>Poids brut</span>
            <span>0</span>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
            <span>Total HT</span>
            <span></span>
          </div>
          <div className="flex justify-between text-[12px] text-gray-700 max-w-xs">
            <span>Total HT devise</span>
            <span></span>
          </div>
        </div>
      </div>
  )
}
