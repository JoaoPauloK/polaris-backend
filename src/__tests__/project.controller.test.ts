import request from 'supertest';
import app from '../server';
import { beforeAll, describe, expect, it } from 'vitest';

describe('ProjectController', () => {
  let cookie: string;
  let projectId: number;
  const uniqueEmail = `projuser_${Date.now()}@example.com`;

  beforeAll(async () => {
    // Cria e loga usuário
    await request(app).post('/api/auth/register').send({
      name: 'Proj User', email: uniqueEmail, password: 'test1234'
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: uniqueEmail, password: 'test1234'
    });
    cookie = loginRes.headers['set-cookie'];
  });

  it('deve criar um novo projeto', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send({
        name: 'Projeto Teste',
        driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
        packagePhotosCount: 10
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    projectId = res.body.data.project.id;
  });

  it('deve listar projetos do usuário', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', cookie);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
  });

  it('deve buscar detalhes de um projeto', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', cookie);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.project.id).toBe(projectId);
  });
});
