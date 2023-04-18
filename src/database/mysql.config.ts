import { DataSource } from 'typeorm';
import 'reflect-metadata';
import User from '../entity/user.entity.js';

const mysqlDataSrc = new DataSource({
  type: 'mysql',
  poolSize: 5,
  logging: true,
  synchronize: true,
  username: process.env.USER,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  port: 3306,
  database: process.env.DATABASE,
  entities: [User],
  ssl: {
    rejectUnauthorized: true,
  },
});

export default mysqlDataSrc;
