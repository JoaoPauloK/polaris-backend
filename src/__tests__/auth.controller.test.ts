import request from 'supertest';
import app from '../server';

// Mock do auth service
vi.mock('../services/auth.service.js', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
  },
}));

import { authService } from '../services/auth.service.js';

describe('AuthController', () => {
  const uniqueEmail = `testuser_${Date.now()}@example.com`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar um novo usuário', async () => {
    // Arrange
    const mockResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-123',
        name: 'Test User',
        email: uniqueEmail,
        phone: '123456789',
        businessName: 'Test Business',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(authService.register).mockResolvedValue(mockResponse);

    // Act
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: uniqueEmail,
        password: 'test1234',
        phone: '123456789',
        businessName: 'Test Business',
      });

    // Assert
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Test User',
      email: uniqueEmail,
      password: 'test1234',
      phone: '123456789',
      businessName: 'Test Business',
    });
  });

  it('deve fazer login com usuário existente', async () => {
    // Arrange
    const mockResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-123',
        name: 'Test User',
        email: uniqueEmail,
        phone: null,
        businessName: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'test1234',
      });

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(authService.login).toHaveBeenCalledWith({
      email: uniqueEmail,
      password: 'test1234',
    });
  });

  it('deve recusar login com senha errada', async () => {
    // Arrange
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'wrongpass',
      });

    // Assert
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(authService.login).toHaveBeenCalledWith({
      email: uniqueEmail,
      password: 'wrongpass',
    });
  });
});
