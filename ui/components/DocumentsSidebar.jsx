import React from 'react'
import { DOCUMENT_TYPES } from '../constants/documentTypes'

export default function DocumentsSidebar({ activeType, onSelect }) {
  const items = [...DOCUMENT_TYPES.map((d) => ({ key: d.type, label: d.label, type: d.type }))]

  return (
    <div className="w-[190px] shrink-0 border-r border-gray-300 bg-white py-1">
      {items.map((item) => {
        const isActive = item.type === activeType
        return (
          <div
            key={item.key}
            onClick={() => onSelect(item.type ?? item.key)}
            className={`px-3 py-1.5 text-[13px] cursor-pointer select-none ${
              isActive ? 'bg-[#1677ff] text-white' : 'text-[#1677ff] hover:bg-blue-50'
            }`}
          >
            {item.label}
          </div>
        )
      })}
    </div>
  )
}
