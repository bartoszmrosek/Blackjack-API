import { DataSource } from "typeorm";

const mysqlDataSrc = new DataSource({
    type: "mysql",
    poolSize: 5,
    logging: true,   
    synchronize: process.env.NODE_ENV !== "production" ? true : false,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: 3306,
    database: process.env.DATABASE,
    entities: ["src/entities/*.js"]
})