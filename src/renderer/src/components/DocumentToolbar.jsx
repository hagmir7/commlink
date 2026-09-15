import React from 'react'

import {
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  DownOutlined,
  PrinterOutlined,
  CalculatorOutlined,
  SwapOutlined,
  LockOutlined,
  SendOutlined,
  CaretDownOutlined,

} from "@ant-design/icons";


function ToolbarButton({ icon, label, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1",
        "text-[11px] leading-none border-r border-gray-200 last:border-r-0",
        disabled
          ? "text-gray-400 cursor-not-allowed"
          : "text-gray-700 hover:bg-blue-50 cursor-pointer",
      ].join(" ")}
      style={{ minWidth: 78 }}
    >
      <span className="text-[15px]">{icon}</span>
      <span className="flex items-center gap-0.5">
        {label}
        <DownOutlined style={{ fontSize: 8 }} />
      </span>
    </button>
  );
}


export default function DocumentToolbar() {
    return (
        <div className="shrink-0 flex items-stretch bg-white border-b border-gray-300">
            <ToolbarButton icon={<SettingOutlined />} label="Fonctions" />
            <ToolbarButton icon={<BarChartOutlined />} label="Barèmes" />
            <ToolbarButton icon={<InfoCircleOutlined />} label="Informations" />
            <ToolbarButton icon={<CaretDownOutlined />} label="Pied" />
            <ToolbarButton icon={<PrinterOutlined />} label="Imprimer" />
            <ToolbarButton icon={<CalculatorOutlined />} label="Comptabiliser" disabled />
            <ToolbarButton icon={<SwapOutlined />} label="Transformer" />
            <ToolbarButton icon={<LockOutlined />} label="Valider" disabled />
            <ToolbarButton icon={<SendOutlined />} label="Expédition" />
        </div>
    )
}
