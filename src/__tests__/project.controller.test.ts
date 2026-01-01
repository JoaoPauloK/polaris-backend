import request from 'supertest';
import app from '../server';

// Mock do project service
vi.mock('../services/project.service.js', () => ({
  projectService: {
    createProject: vi.fn(),
    getProjects: vi.fn(),
    getProject: vi.fn(),
  },
}));

// Mock do middleware de autenticação
vi.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    (req as any).user = { userId: 123 };
    next();
  }),
  authenticateToken: vi.fn((req, res, next) => {
    (req as any).user = { userId: 123 };
    next();
  }),
}));

import { projectService } from '../services/project.service.js';

describe('ProjectController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar um novo projeto', async () => {
    // Arrange
    const mockProject = {
      id: 1,
      name: 'Projeto Teste',
      description: null,
      driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
      driveFolderId: 'test123',
      packagePhotosCount: 10,
      additionalPhotoPrice: '50.00',
      galleryToken: 'mock-token',
      status: 'active',
      userId: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
      photosCount: 0,
      selectionsCount: 0,
      galleryUrl: 'http://localhost:5173/gallery/mock-token',
    };

    vi.mocked(projectService.createProject).mockResolvedValue(mockProject);

    // Act
    const res = await request(app)
      .post('/api/projects')
      .send({
        name: 'Projeto Teste',
        driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
        packagePhotosCount: 10
      });

    // Assert
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.id).toBe(1);
    expect(res.body.data.project.name).toBe('Projeto Teste');
    expect(projectService.createProject).toHaveBeenCalledWith(123, {
      name: 'Projeto Teste',
      driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
      packagePhotosCount: 10
    });
  });

  it('deve listar projetos do usuário', async () => {
    // Arrange
    const mockProjects = [
      {
        id: 1,
        name: 'Projeto Teste',
        description: null,
        driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
        driveFolderId: 'test123',
        packagePhotosCount: 10,
        additionalPhotoPrice: '50.00',
        galleryToken: 'mock-token',
        status: 'active',
        userId: 123,
        createdAt: new Date(),
        updatedAt: new Date(),
        photosCount: 0,
        selectionsCount: 0,
        galleryUrl: 'http://localhost:5173/gallery/mock-token',
      }
    ];

    vi.mocked(projectService.getProjects).mockResolvedValue(mockProjects);

    // Act
    const res = await request(app)
      .get('/api/projects');

    // Assert
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.data.projects).toHaveLength(1);
    expect(res.body.data.projects[0].name).toBe('Projeto Teste');
    expect(projectService.getProjects).toHaveBeenCalledWith(123, undefined);
  });

  it('deve buscar detalhes de um projeto', async () => {
    // Arrange
    const mockProject = {
      id: 1,
      name: 'Projeto Teste',
      description: null,
      driveFolderUrl: 'https://drive.google.com/drive/folders/test123',
      driveFolderId: 'test123',
      packagePhotosCount: 10,
      additionalPhotoPrice: '50.00',
      galleryToken: 'mock-token',
      status: 'active',
      userId: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
      photosCount: 0,
      selectionsCount: 0,
      galleryUrl: 'http://localhost:5173/gallery/mock-token',
    };

    vi.mocked(projectService.getProject).mockResolvedValue(mockProject);

    // Act
    const res = await request(app)
      .get('/api/projects/1');

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.body.data.project.id).toBe(1);
    expect(res.body.data.project.name).toBe('Projeto Teste');
    expect(projectService.getProject).toHaveBeenCalledWith(1, 123);
  });
});
