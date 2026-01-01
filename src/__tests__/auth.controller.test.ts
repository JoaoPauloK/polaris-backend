import request from 'supertest';
import app from '../server';

describe('AuthController', () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  it('deve registrar um novo usuário', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: uniqueEmail,
        password: 'test1234',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
  });

  it('deve fazer login com usuário existente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'test1234',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('deve recusar login com senha errada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'wrongpass',
      });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
