import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import type { NewUser, User } from '../db/schema.js';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: Omit<User, 'password'>;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  async register(data: RegisterData): Promise<AuthResponse> {
    // Verificar se o email já existe
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Criar usuário
    const userData: NewUser = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      businessName: data.businessName,
    };

    const user = await userRepository.create(userData);

    // Gerar tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      token,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Buscar usuário
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Gerar tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      token,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as { userId: number; email: string };

      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async getProfile(userId: number): Promise<Omit<User, 'password'>> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, data: Partial<RegisterData>): Promise<Omit<User, 'password'>> {
    const updateData: Partial<NewUser> = {
      name: data.name,
      phone: data.phone,
      businessName: data.businessName,
    };

    // Se houver senha, fazer hash
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await userRepository.update(userId, updateData);
    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  private generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN }
    );
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  verifyToken(token: string): { userId: number; email: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET) as { userId: number; email: string };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService();
