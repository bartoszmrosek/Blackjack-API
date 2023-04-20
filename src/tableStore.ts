import Table from './tableLogic/Table.js';

const allGameTables: Table[] = [];
export function removeEmptyTable(tableId: string) {
  const removedTableIndex = allGameTables.findIndex((table) => table.getTableId() === tableId);
  if (removedTableIndex > -1) {
    allGameTables.splice(removedTableIndex, 1);
  }
}

export default allGameTables;
