import mysqlDataSrc from '../database/mysql.config.js'

const testingDb = {
    async connect(){
        await mysqlDataSrc.initialize();
    },
     async disconnect(){
         await mysqlDataSrc.destroy()
    },
    async clear(){
        const entities = mysqlDataSrc.entityMetadatas;
        const allPromises = entities.map((entity) => async () =>{
            const repo = mysqlDataSrc.getRepository(entity.name);
            await repo.query(`DELETE FROM ${entity.tableName}`);
        })
        await Promise.all(allPromises);
    }
}

export default testingDb;