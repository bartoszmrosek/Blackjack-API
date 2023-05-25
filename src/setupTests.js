import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import mysqlDataSrc from './database/mysql.config.js';

jest.mock('socket.io', () => ({
    Server: jest.fn(() => ({
        engine: { use: jest.fn() },
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

afterAll(async () => {
    await mysqlDataSrc.destroy();
});

const token = jwt.sign({ username: 'test' }, process.env.SECRET_KEY, { expiresIn: '24h' });

global.token = token;
global.jest = jest;
