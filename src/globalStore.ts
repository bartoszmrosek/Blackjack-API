import User from './entity/user.entity.js';
import Table from './tableLogic/table.js';

const allGameTables: Table[] = [];
export function removeEmptyTable(tableId: string) {
  const removedTableIndex = allGameTables.findIndex((table) => table.getTableId() === tableId);
  if (removedTableIndex > -1) {
    allGameTables.splice(removedTableIndex, 1);
  }
}

const usersMap = new Map<number, {sourceFor: number} & User>();

export { usersMap };
export default allGameTables;
