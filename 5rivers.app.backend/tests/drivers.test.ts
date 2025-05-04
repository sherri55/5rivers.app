import request from 'supertest';
import app from '../src/index';

describe('Drivers API', () => {
  let createdId: string;
  const testDriver = { name: 'Test Driver', hourlyRate: 25 };

  it('should create a driver', async () => {
    const res = await request(app)
      .post('/drivers')
      .send(testDriver)
      .expect(201);
    expect(res.body).toHaveProperty('driverId');
    expect(res.body.name).toBe(testDriver.name);
    createdId = res.body.driverId;
  });

  it('should get all drivers', async () => {
    const res = await request(app).get('/drivers').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a driver by id', async () => {
    const res = await request(app).get(`/drivers/${createdId}`).expect(200);
    expect(res.body.driverId).toBe(createdId);
  });

  it('should update a driver', async () => {
    const res = await request(app)
      .put(`/drivers/${createdId}`)
      .send({ name: 'Updated Driver', hourlyRate: 30 })
      .expect(200);
    expect(res.body.name).toBe('Updated Driver');
    expect(res.body.hourlyRate).toBe(30);
  });

  it('should delete a driver', async () => {
    await request(app).delete(`/drivers/${createdId}`).expect(200);
    // Confirm deletion
    await request(app).get(`/drivers/${createdId}`).expect(404);
  });
});
