import request from 'supertest';
import allGameTables from '../../globalStore';
import app from '../../app';

const ROOMS_ROUTE = '/api/rooms';

const roomsArray = [{ id: 0, playersNum: 3 }];
jest.spyOn(allGameTables, 'map').mockReturnValueOnce(roomsArray);

describe('Rooms REST endpoint', () => {
  it('on GET root route should return JSON array of rooms', async () => {
    const res = await request(app).get(`${ROOMS_ROUTE}/`);
    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual(roomsArray);
  });
  describe('authorized requests', () => {
    it('on POST /create route should create new room when authorized', async () => {
      const res = await request(app)
        .post(`${ROOMS_ROUTE}/create`)
        .set('Cookie', [`token=${global.token}`]);
      expect(res.body).toHaveProperty('id');
    });
    it('new room id should be retrieved on GET route after creation', async () => {
      const postRes = await request(app)
        .post(`${ROOMS_ROUTE}/create`)
        .set('Cookie', [`token=${global.token}`]);
      const getRes = await request(app).get(`${ROOMS_ROUTE}/`);
      expect(getRes.body[1]).toMatchObject(postRes.body);
    });
  });
  describe('uncomplete and unauthorized requests', () => {
    it('should return 401 if no token is found', async () => {
      const res = await request(app).post(`${ROOMS_ROUTE}/create`);
      expect(res.statusCode).toBe(401);
    });
    it('should return 400 if token is wrong', async () => {
      const res = await request(app)
        .post(`${ROOMS_ROUTE}/create`)
        .set('Cookie', ['token=WRONGTOKEN']);
      expect(res.statusCode).toBe(400);
    });
  });
});
