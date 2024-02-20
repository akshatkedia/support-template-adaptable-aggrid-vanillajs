import '../style.css';

import { Controller } from '@hotwired/stimulus';

import Adaptable from '@adaptabletools/adaptable/agGrid';

import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { SideBarModule } from '@ag-grid-enterprise/side-bar';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { GridChartsModule } from '@ag-grid-enterprise/charts';
import { LicenseManager } from '@ag-grid-enterprise/core';
import { StatusBarModule } from '@ag-grid-enterprise/status-bar';

const agGridModules = [
  ClientSideRowModelModule,
  SideBarModule,
  MenuModule,
  GridChartsModule,
  StatusBarModule,
];

LicenseManager.setLicenseKey(
  '[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-052646}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{29 February 2024}____[v3]_[0102]_MTcwOTE2NDgwMDAwMA==b1896dfdfbb4dc28dfd4e4366ce39bbd'
);

export default class extends Controller {
  static values = {
    stock: Number,
  };
  static targets = ['chart', 'grid', 'stock', 'chart'];

  async connect() {
    const response = await fetch('/supply_plan.json');
    const data = await response.json();

    const adaptableOptions = {
      primaryKey: 'id',
      adaptableId: 'Scenario Planning',
      licenseKey:
        'AppName=SCmple-Trial|Owner=SCmple|StartDate=2024-02-08|EndDate=2024-04-08|Ref=AdaptableLicense|Trial=true|TS=1707390541529|C=410313644,3932586611,4261170317,1260976079,2566043046,3180980858,1302728593,1033452304',
      chartingOptions: {
        saveStrategy: 'none',
        chartContainers: [
          {
            name: 'Above Grid',
            element: '#chart-container',
            chartsDisplay: 'multiple',
          },
        ],
      },
      predefinedConfig: {
        Layout: {
          CurrentLayout: 'Default',
          Layouts: [
            {
              Columns: [
                'month_year',
                'demand',
                'projected_receipts',
                'safety_stock',
                'production_plan',
                'available',
                'projected_inventory',
              ],
              Name: 'Default',
            },
          ],
        },
        CalculatedColumn: {
          CalculatedColumns: [
            {
              ColumnId: 'safety_stock',
              FriendlyName: 'Safety Stock',
              Query: {
                ScalarExpression: 'CALCULATE_SAFETY_STOCK()',
              },
              CalculatedColumnSettings: {
                DataType: 'Number',
              },
            },
            {
              ColumnId: 'production_plan',
              FriendlyName: 'Production Plan',
              Query: {
                ScalarExpression: 'CALCULATE_PRODUCTION_PLAN([demand], [safety_stock])',
              },
              CalculatedColumnSettings: {
                DataType: 'Number',
              },
            },
            {
              ColumnId: 'available',
              FriendlyName: 'Available',
              Query: {
                ScalarExpression:
                  "VAR('PREVIOUS_MONTH_PROJECTED_INVENTORY', [id]) + [production_plan] - [demand] - [safety_stock]",
              },
              CalculatedColumnSettings: {
                DataType: 'Number',
              },
            },
            {
              ColumnId: 'projected_inventory',
              FriendlyName: 'Projected Inventory',
              Query: {
                ScalarExpression:
                  "VAR('PREVIOUS_MONTH_PROJECTED_INVENTORY', [id]) + [production_plan] - [demand]",
              },
              CalculatedColumnSettings: {
                DataType: 'Number',
              },
            },
          ],
        },
      },
      expressionOptions: {
        customQueryVariables: {
          PREVIOUS_MONTH_PROJECTED_INVENTORY: (context) => {
            const currentRowId = Number(context.args);

            const firstRowID = context.adaptableApi.gridApi.getFirstRowNode().data.id;
            let previousMonthProjectedInventory = Number(document.querySelector('#stock').value);
            const allRowNodes = context.adaptableApi.gridApi.getAllRowNodes();

            if (currentRowId !== firstRowID) {
              for (let id = firstRowID; id < currentRowId; id++) {
                let currentIterationRow = context.adaptableApi.gridApi.getRowNodeForPrimaryKey(id);
                const currentMontYear = currentIterationRow.data.month_year;
                const safetyStockDuration = Number(
                  document.querySelector('#safety-stock-duration').value
                );
                const safetyStockDurationPeriod = document.querySelector(
                  '#safety-stock-duration-period'
                ).value;
                let safetyStockDurationInMonths = 0;

                switch (safetyStockDurationPeriod) {
                  case 'Days':
                    if ([365, 366].includes(safetyStockDuration)) {
                      safetyStockDurationInMonths = 12;
                    } else {
                      safetyStockDurationInMonths = safetyStockDuration / 30;
                    }
                    break;
                  case 'Years':
                    safetyStockDurationInMonths = safetyStockDuration * 12;
                    break;
                  default:
                    safetyStockDurationInMonths = safetyStockDuration;
                }

                const numberOfMonths = Math.ceil(safetyStockDurationInMonths);
                const lastMonthMultiplier = safetyStockDurationInMonths % 1;
                let safetyStock = 0;

                for (let index = 1; index <= numberOfMonths; index++) {
                  const newDate = new Date(currentMontYear.getTime()); // Create a copy of the date object
                  newDate.setMonth(newDate.getMonth() + index); // Add one month
                  const rowNodeAtNewDate = allRowNodes.find(
                    (node) => node.data.month_year.toString() === newDate.toString()
                  );

                  if (rowNodeAtNewDate) {
                    const demandAtNewDate = rowNodeAtNewDate.data.demand;
                    if (index === numberOfMonths && lastMonthMultiplier > 0) {
                      safetyStock += demandAtNewDate * lastMonthMultiplier;
                    } else {
                      safetyStock += demandAtNewDate;
                    }
                  }
                }

                let currentIterationDemand = currentIterationRow.data.demand;
                let currentIterationProductionPlan = 0;
                let currentIterationAvailable =
                  previousMonthProjectedInventory - currentIterationDemand - safetyStock;

                if (currentIterationAvailable < 0) {
                  let fulfillmentMultiplier = Math.ceil(Math.abs(currentIterationAvailable / 750));
                  currentIterationProductionPlan = 750 * fulfillmentMultiplier;
                }

                previousMonthProjectedInventory =
                  previousMonthProjectedInventory +
                  currentIterationProductionPlan -
                  currentIterationDemand;
              }
            }

            return previousMonthProjectedInventory;
          },
        },
        customScalarFunctions: {
          CALCULATE_SAFETY_STOCK: {
            handler(args, context) {
              const currentMontYear = context.node.data.month_year;
              const safetyStockDuration = Number(
                document.querySelector('#safety-stock-duration').value
              );
              const safetyStockDurationPeriod = document.querySelector(
                '#safety-stock-duration-period'
              ).value;
              let safetyStockDurationInMonths = 0;

              switch (safetyStockDurationPeriod) {
                case 'Days':
                  if ([365, 366].includes(safetyStockDuration)) {
                    safetyStockDurationInMonths = 12;
                  } else {
                    safetyStockDurationInMonths = safetyStockDuration / 30;
                  }
                  break;
                case 'Years':
                  safetyStockDurationInMonths = safetyStockDuration * 12;
                  break;
                default:
                  safetyStockDurationInMonths = safetyStockDuration;
              }

              const numberOfMonths = Math.ceil(safetyStockDurationInMonths);
              const lastMonthMultiplier = safetyStockDurationInMonths % 1;
              let safetyStock = 0;
              const allRowNodes = context.adaptableApi.gridApi.getAllRowNodes();

              for (let index = 1; index <= numberOfMonths; index++) {
                const newDate = new Date(currentMontYear.getTime()); // Create a copy of the date object
                newDate.setMonth(newDate.getMonth() + index); // Add one month
                const rowNodeAtNewDate = allRowNodes.find(
                  (node) => node.data.month_year.toString() === newDate.toString()
                );

                if (rowNodeAtNewDate) {
                  const demandAtNewDate = rowNodeAtNewDate.data.demand;
                  if (index === numberOfMonths && lastMonthMultiplier > 0) {
                    safetyStock += demandAtNewDate * lastMonthMultiplier;
                  } else {
                    safetyStock += demandAtNewDate;
                  }
                }
              }

              return safetyStock;
            },
          },
          CALCULATE_PRODUCTION_PLAN: {
            handler(args, context) {
              const demand = args[0];
              const safetyStock = args[1];
              const previousMonthProjectedInventory = context.evaluateCustomQueryVariable(
                'PREVIOUS_MONTH_PROJECTED_INVENTORY',
                context.node.id
              );
              let productionPlan = 0;
              let available = previousMonthProjectedInventory - demand - safetyStock;

              if (available < 0) {
                let fulfillmentMultiplier = Math.ceil(Math.abs(available / 750));
                productionPlan = 750 * fulfillmentMultiplier;
              }

              return productionPlan;
            },
          },
        },
      },
    };

    const gridOptions = {
      autoSizeStrategy: {
        type: 'fitCellContents',
      },
      enableCharts: true,
      enableCellChangeFlash: true,
      columnDefs: [
        {
          field: 'id',
          type: 'abColDefNumber',
          hide: true,
        },
        {
          field: 'month_year',
          headerName: 'Month Year',
          type: 'abColDefDate',
          valueFormatter: (params) => {
            const dateFormatted = new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(params.value);

            return dateFormatted;
          },
        },
        {
          field: 'demand',
          type: 'abColDefNumber',
          editable: true,
        },
        {
          field: 'projected_receipts',
          headerName: 'Projected Receipts',
          type: 'abColDefNumber',
        },
      ],
      rowData: this.parseData(data),
    };

    const agGridConfig = {
      modules: agGridModules,
      gridOptions: gridOptions,
    };

    this.adaptableApi = await Adaptable.init(adaptableOptions, agGridConfig);
    this.adaptableApi.eventApi.on('CellChanged', (eventInfo) => {
      if (eventInfo.cellChange.column.columnId === 'demand') {
        eventInfo.adaptableApi.gridApi.refreshColumn('safety_stock');
        eventInfo.adaptableApi.gridApi.refreshColumn('production_plan');
        eventInfo.adaptableApi.gridApi.refreshColumn('available');
        eventInfo.adaptableApi.gridApi.refreshColumn('projected_inventory');
      }
    });
    this.adaptableApi.eventApi.on('AdaptableReady', (eventInfo) => {
      eventInfo.gridOptions.api.createRangeChart({
        chartType: 'column',
        cellRange: {
          columns: ['month_year', 'demand', 'production_plan'],
        },
        chartContainer: this.chartTargets[0],
      });
      eventInfo.gridOptions.api.createRangeChart({
        chartType: 'area',
        cellRange: {
          columns: ['month_year', 'projected_inventory', 'projected_receipts', 'safety_stock'],
        },
        chartContainer: this.chartTargets[1],
      });
    });
  }

  parseData(data) {
    return data.map((item) => ({
      ...item, // Spread operator to copy properties from original object
      id: Number(item.id),
      month_year: new Date(item.month_year),
      demand: Number(item.demand),
      projected_receipts: Number(item.projected_receipts),
      production_plan: Number(item.production_plan),
      safety_stock: Number(item.safety_stock),
      projected_inventory: Number(item.projected_inventory),
      months_of_supply: Number(item.months_of_supply),
    }));
  }

  performCalculations() {
    this.adaptableApi.gridApi.refreshColumn('production_plan');
    this.adaptableApi.gridApi.refreshColumn('available');
    this.adaptableApi.gridApi.refreshColumn('projected_inventory');
  }

  updateSafetyStock() {
    this.adaptableApi.gridApi.refreshColumn('safety_stock');
    this.adaptableApi.gridApi.refreshColumn('production_plan');
    this.adaptableApi.gridApi.refreshColumn('available');
    this.adaptableApi.gridApi.refreshColumn('projected_inventory');
  }
}
