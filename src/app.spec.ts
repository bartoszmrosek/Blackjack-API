import request from 'supertest';
import { app } from './app';

test("jest properly configured", async ()=>{
    const response = await request(app).get("/").set("Authorization", `Bearer ${process.env.TESTING_TOKEN as string}`)
    expect(response.statusCode).toBe(200)
})