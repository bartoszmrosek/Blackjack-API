import request from 'supertest';
import mysqlDataSrc from '../../database/mysql.config';
import User from '../../entity/user.entity';
import app from '../../app';

const REGISTER_ROUTE = '/api/register';
describe('REST register route', () => {
  it('should respond with 400 if fields are missing', async () => {
    const res = await request(app).post(`${REGISTER_ROUTE}/`);
    expect(res.statusCode).toBe(400);
  });
  it('should return code 500 when user already exists', async () => {
    const res = await request(app).post(`${REGISTER_ROUTE}/`).send({ username: 'test', password: 'abcd' });
    expect(res.statusCode).toBe(500);
  });
  describe('should handle new user creation', () => {
    const newUser = { username: 'supertest', password: 'strongpassword' };
    const userRepo = mysqlDataSrc.getRepository(User);
    beforeEach(() => {
      userRepo.delete({ username: newUser.username });
    });
    it('should create new user on POST root route', async () => {
      const res = await request(app).post(`${REGISTER_ROUTE}/`).send(newUser);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('balance');
    });
    it('should set cookie on success request', async () => {
      const res = await request(app).post(`${REGISTER_ROUTE}/`).send(newUser);
      expect(res.headers['set-cookie'][0]).toMatch(/token=[^]*;/);
    });
  });
});
