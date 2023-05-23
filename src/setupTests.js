import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

jest.mock('socket.io', () => ({
    Server: jest.fn(() => ({
        engine: { use: jest.fn() },
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    })),
}));

const token = jwt.sign({ username: 'test' }, process.env.SECRET_KEY, { expiresIn: '24h' });

global.token = token;
global.jest = jest;
