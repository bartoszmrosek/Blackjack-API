import request from 'supertest';
import app from '../../app';

const LOGOUT_ROUTE = '/api/logout';
describe('REST logout route', () => {
  it('should set rubbish cookie on logout', async () => {
    const res = await request(app).post(`${LOGOUT_ROUTE}/`);
    expect(res.headers['set-cookie'][0]).toMatch('token=rubbish');
  });
  it('should return code 200 on success', async () => {
    const res = await request(app).post(`${LOGOUT_ROUTE}/`);
    expect(res.statusCode).toBe(200);
  });
});
