import React from 'react'
import { Select, Input, Checkbox, Button } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import DesktopWindow from './DesktopWindow'

const StockUnavailabilityModal = ({ open, onClose }) => {
  return (
    <DesktopWindow
      open={open}
      onClose={onClose}
      canClose={false}
      title="Indisponibilité en stock : PR07AF01001"
      width={600} // Slightly wider than default to fit the table comfortably
    >
      {/* 
        The DesktopWindow body has a white background by default. 
        We wrap our content in a light gray container to match the original screenshot.
      */}
      <div className="flex flex-col text-xs text-gray-800 bg-[#f5f5f5] min-h-full">
        {/* Section 1: Interroger */}
        <div className="bg-gray-200 px-3 py-1.5 border-b border-gray-300 flex items-center pb-2 gap-2 text-gray-600 font-medium">
          <SearchOutlined className="text-gray-500" />
          Interroger
        </div>

        <div className="p-3 space-y-4">
          {/* Section 2: Stock de l'article */}
          <div>
            <h3 className="mb-2 text-gray-700 font-medium">Stock de l'article</h3>

            <div className="pb-2 pl-6">
              <div className="flex items-center pb-2 gap-2">
                <span className="w-40 text-right mr-2">Dépôt</span>
                <Select
                  defaultValue="STILEMOBILI"
                  className="w-64"
                  size="small"
                  options={[{ value: 'STILEMOBILI', label: 'STILEMOBILI' }]}
                  disabled
                />
              </div>
            </div>

            {/* Table Replication */}
            <div className="border border-blue-800 rounded-sm overflow-hidden bg-white">
              {/* Table Header */}
              <div className="flex border-b border-blue-800 bg-gray-50/50">
                <div className="flex-1 p-1 border-r border-blue-800 font-semibold text-gray-700">
                  Référence article
                </div>
                <div className="w-28 p-1 border-r border-blue-800 font-semibold text-center">
                  Stock disponible
                </div>
                <div className="w-28 p-1 font-semibold text-center">Stock à terme</div>
              </div>
              {/* Table Body */}
              <div className="flex">
                <div className="flex-1 p-1 border-r border-blue-800">
                  <div className="text-blue-800 font-medium">
                    porte afragola laca G3 YELLOW GROUND 350*300
                  </div>
                  <div className="mt-1">Substitution :</div>
                </div>
                <div className="w-28 p-1 border-r border-blue-800 flex flex-col items-end justify-start">
                  <span>0,00</span>
                  <span>0,00</span>
                </div>
                <div className="w-28 p-1 flex flex-col items-end justify-start">
                  <span>-2,00</span>
                  <span>0,00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Validation quantité livrée */}
          <div className="pt-2">
            <h3 className="mb-2 text-gray-700 font-medium">Validation quantité livrée</h3>
            <div className="pb-2 pl-6">
              <div className="flex items-center pb-2 gap-2">
                <span className="w-40 text-right mr-2">Quantité demandée</span>
                <Input size="small" defaultValue="1,00" style={{ width: '256px' }} disabled />
              </div>
              <div className="flex items-center pb-2 gap-2">
                <span className="w-40 text-right mr-2">Quantité à livrer</span>
                <Input size="small" defaultValue="0" style={{ width: '256px' }} />
              </div>
            </div>
          </div>

          {/* Section 4: Traitement de l'indisponibilité de stock */}
          <div>
            <h3 className="mb-2 text-gray-700 font-medium">
              Traitement de l'indisponibilité de stock
            </h3>

            <div className="mb-2">
              {/* Gérer un reliquat */}
              <div className="flex items-center pb-2 gap-2">
                <Checkbox defaultChecked />
                <p>Gérer un reliquat</p>
              </div>
              <div className="pb-2 pl-6">
                <div className="flex items-center pb-2 gap-2">
                  <span className="w-40 text-right mr-2">Quantité en reliquat</span>
                  <Input
                    size="small"
                    defaultValue="1"
                    className="w-64"
                    style={{ width: '256px' }}
                  />
                </div>
              </div>

              {/* Générer un document */}
              <div className="flex items-center pb-2 gap-2">
                <Checkbox />
                <p>Générer un document</p>
              </div>

              <div className="pb-2 pl-6">
                <div className="flex items-center pb-2 gap-2">
                  <span className="w-40 text-right mr-2">Type de document</span>
                  <Select
                    defaultValue="Commande fournisseur"
                    className="w-64"
                    size="small"
                    disabled
                    options={[{ value: 'Commande fournisseur', label: 'Commande fournisseur' }]}
                  />
                </div>
                <div className="flex items-center pb-2 gap-2">
                  <span className="w-40 text-right mr-2">Choix de traitement</span>
                  <Select
                    defaultValue="Compléter un document existant"
                    className="w-64"
                    size="small"
                    disabled
                    options={[
                      {
                        value: 'Compléter un document existant',
                        label: 'Compléter un document existant'
                      }
                    ]}
                  />
                </div>
                <div className="flex items-center pb-2 gap-2">
                  <span className="w-40 text-right mr-2">Souche du document</span>
                  <Select
                    defaultValue="Souche par défaut"
                    className="w-64"
                    size="small"
                    disabled
                    options={[{ value: 'Souche par défaut', label: 'Souche par défaut' }]}
                  />
                </div>

                {/* Fournisseur & Tarifs */}
                <div className="flex items-center pb-2 gap-2">
                  {/* Spacer so the selects line up with the other inputs */}
                  <span className="w-40 mr-2" />
                  <div className="w-64 flex gap-2">
                    <Select
                      defaultValue="Fournisseur principal"
                      className="flex-1"
                      size="small"
                      options={[{ value: 'Fournisseur principal', label: 'Fournisseur principal' }]}
                    />
                    <Select
                      defaultValue="FR001"
                      className="w-24"
                      size="small"
                      options={[{ value: 'FR001', label: 'FR001' }]}
                    />
                  </div>
                  <a href="#" className="text-blue-600 hover:underline">
                    Consulter les tarifs...
                  </a>
                </div>

                <div className="flex items-center pb-2 gap-2">
                  <span className="w-40 text-right mr-2">Quantité à commander</span>
                  <Input size="small" style={{ width: '256px' }} disabled />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Footer */}
        <div className="bg-gray-100 px-3 py-2 border-t border-gray-300 flex justify-end gap-2 mt-auto">
          <Button size="small" disabled className="rounded-sm text-xs px-4">
            Substitution
          </Button>
          <Button size="small" disabled className="rounded-sm text-xs px-4">
            OK pour tous
          </Button>
          <Button type="primary" size="small" className="rounded-sm text-xs px-6 bg-blue-600">
            OK
          </Button>
          <Button size="small" onClick={onClose} className="rounded-sm text-xs px-4">
            Annuler
          </Button>
        </div>
      </div>
    </DesktopWindow>
  )
}

export default StockUnavailabilityModal
