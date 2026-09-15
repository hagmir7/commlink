import React from 'react';
import { DatePicker, Dropdown, Input, Select } from 'antd';
import { DownOutlined, SearchOutlined, SettingOutlined, StarOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

export default function DocumentsToolbar({
  clientOptions,
  clientCode,
  onClientChange,
  dateRange,
  onDateRangeChange,
  search,
  onSearchChange,
}) {
  const filterContent = (
    <div className="p-3 w-72 flex flex-col gap-3 bg-white shadow-lg rounded border border-gray-200">
      <div>
        <div className="text-[12px] text-gray-600 mb-1">Client</div>
        <Select
          allowClear
          showSearch
          size="small"
          className="w-full"
          placeholder="Tous les clients"
          options={clientOptions}
          value={clientCode || undefined}
          onChange={onClientChange}
          optionFilterProp="label"
          filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
        />
      </div>
      <div>
        <div className="text-[12px] text-gray-600 mb-1">Période</div>
        <RangePicker size="small" className="w-full" format="DDMMYY" value={dateRange} onChange={onDateRangeChange} />
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-gray-300 bg-white text-[13px]">
      <Dropdown menu={{ items: [] }} trigger={['click']}>
        <span className="flex items-center gap-1 cursor-pointer text-gray-700 hover:text-blue-600">
          <SettingOutlined /> Fonction <DownOutlined style={{ fontSize: 9 }} />
        </span>
      </Dropdown>

      <Dropdown dropdownRender={() => filterContent} trigger={['click']}>
        <span className="flex items-center gap-1 cursor-pointer text-gray-700 hover:text-blue-600">
          <SearchOutlined /> Filtrer <DownOutlined style={{ fontSize: 9 }} />
        </span>
      </Dropdown>
      <div className="flex-1" />

      <Input
        size="small"
        suffix={<SearchOutlined className="text-gray-400" />}
        className="w-64"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}