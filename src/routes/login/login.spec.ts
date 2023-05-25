import request from 'supertest';
import app from '../../app';

const LOGIN_ROUTE = '/api/login';
describe('login REST route', () => {
  describe('root route', () => {
    it('should return 400 code on malformed request', async () => {
      const res = await request(app).post(`${LOGIN_ROUTE}/`);
      expect(res.statusCode).toBe(400);
    });
    it('should return code 404 when no user is found', async () => {
      const res = await request(app)
        .post(`${LOGIN_ROUTE}/`)
        .send({
          username: 'totallyrandomusername',
          password: 'a',
        });
      expect(res.statusCode).toBe(404);
    });
    it('should return code 401 when passwords do not match', async () => {
      const res = await request(app)
        .post(`${LOGIN_ROUTE}/`)
        .send({
          username: 'test',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toBe(401);
    });
    it('should return proper user after success login', async () => {
      const res = await request(app)
        .post(`${LOGIN_ROUTE}/`)
        .send({
          username: 'test',
          password: 'aa',
        });
      expect(res.body).toHaveProperty('username');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('balance');
    });
    it('should set cookie after success login', async () => {
      const res = await request(app)
        .post(`${LOGIN_ROUTE}/`)
        .send({
          username: 'test',
          password: 'aa',
        });
      expect(res.headers['set-cookie'][0]).toMatch(/token=[^]*;/);
    });
  });
  describe('token route', () => {
    it('should return 400 code when no token is sent', async () => {
      const res = await request(app).get(`${LOGIN_ROUTE}/token`);
      expect(res.statusCode).toBe(400);
    });
    it('should return code 401 when token is wrong', async () => {
      const res = await request(app)
        .get(`${LOGIN_ROUTE}/token`)
        .set('Cookie', ['token=WRONGTOKEN']);
      expect(res.statusCode).toBe(401);
    });
    it('should reset cookie timer when token is wrong', async () => {
      const res = await request(app)
        .get(`${LOGIN_ROUTE}/token`)
        .set('Cookie', ['token=WRONGTOKEN']);
      expect(res.headers['set-cookie'][0]).toMatch(/Max-Age=0;/);
    });
    it('should return user when token is valid', async () => {
      const res = await request(app)
        .get(`${LOGIN_ROUTE}/token`)
        .set('Cookie', [`token=${global.token}`]);
      expect(res.body).toHaveProperty('username');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('balance');
    });
  });
});
