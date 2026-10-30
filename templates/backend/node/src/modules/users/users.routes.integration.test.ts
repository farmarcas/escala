import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import { ownerDb } from '../../test-support/owner-db.js';

describe('users routes', () => {
  beforeEach(async () => {
    // Limpeza com o dono do banco: o usuário da aplicação não tem DELETE.
    await ownerDb.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await ownerDb.$disconnect();
  });

  it('deve criar usuário quando dados são válidos', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Ana', email: 'a@a.com' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Ana', email: 'a@a.com' });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it('deve responder 400 quando body é inválido', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ name: 'A', email: 'nao-email', extra: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('deve responder 409 quando e-mail já existe', async () => {
    await request(app).post('/api/v1/users').send({ name: 'Ana', email: 'a@a.com' });

    const response = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Ana', email: 'a@a.com' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('deve responder 404 quando usuário não existe', async () => {
    const response = await request(app).get('/api/v1/users/00000000-0000-4000-8000-000000000000');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('deve listar usuários paginados', async () => {
    await request(app).post('/api/v1/users').send({ name: 'Ana', email: 'a@a.com' });

    const response = await request(app).get('/api/v1/users?page=1&pageSize=20');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
  });

  it('deve remover usuário quando id existe', async () => {
    const created = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Ana', email: 'a@a.com' });

    const removed = await request(app).delete(`/api/v1/users/${created.body.id}`);
    const fetched = await request(app).get(`/api/v1/users/${created.body.id}`);

    expect(removed.status).toBe(204);
    expect(fetched.status).toBe(404);
  });
});
