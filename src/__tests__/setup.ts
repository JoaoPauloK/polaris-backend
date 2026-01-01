import { beforeAll, afterAll, vi } from 'vitest';

// Mock do banco de dados
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve([]))
      }))
    }))
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([]))
    }))
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([]))
      }))
    }))
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve())
  }))
};

// Mock do Drizzle
vi.mock('../db/index.js', () => ({
  db: mockDb
}));

beforeAll(async () => {
  console.log('🧪 Setting up test mocks...');
  // Configurar mocks globais se necessário
  console.log('✅ Test mocks setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test mocks...');
  vi.clearAllMocks();
  console.log('✅ Test mocks cleanup complete');
});

// Exportar mock para uso nos testes
export { mockDb };