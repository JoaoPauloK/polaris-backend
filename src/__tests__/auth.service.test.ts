import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';

// Mock do userRepository
vi.mock('../repositories/user.repository.js', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock do jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      // Arrange
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '123456789',
        businessName: 'Test Business',
      };

      const mockUser = {
        id: 'user-123',
        name: registerData.name,
        email: registerData.email,
        password: 'hashed-password',
        phone: registerData.phone,
        businessName: registerData.businessName,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock das dependências
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('mock-jwt-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        name: registerData.name,
        email: registerData.email,
        password: 'hashed-password',
        phone: registerData.phone,
        businessName: registerData.businessName,
      });
      expect(result).toEqual({
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          phone: mockUser.phone,
          businessName: mockUser.businessName,
          avatarUrl: mockUser.avatarUrl,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
    });

    it('deve lançar erro quando email já existe', async () => {
      // Arrange
      const registerData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      const existingUser = {
        id: 'user-123',
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'hashed-password',
        phone: null,
        businessName: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(existingUser);

      // Act & Assert
      await expect(authService.register(registerData)).rejects.toThrow('Email already registered');
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: loginData.email,
        password: 'hashed-password',
        phone: null,
        businessName: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('mock-jwt-token')
        .mockReturnValueOnce('mock-refresh-token');

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(result).toEqual({
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          phone: mockUser.phone,
          businessName: mockUser.businessName,
          avatarUrl: mockUser.avatarUrl,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
    });

    it('deve lançar erro quando usuário não existe', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
    });

    it('deve lançar erro quando senha está incorreta', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: loginData.email,
        password: 'hashed-password',
        phone: null,
        businessName: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });
  });
});