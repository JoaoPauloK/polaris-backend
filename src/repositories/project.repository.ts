import { eq, and, desc, count, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { projects, photos, selections, type Project, type NewProject } from '../db/schema.js';

export class ProjectRepository {
  async create(data: NewProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async findById(id: number): Promise<Project | undefined> {
    return await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        user: {
          columns: {
            password: false,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Project | undefined> {
    return await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
    });
  }

  async findByGalleryToken(token: string): Promise<Project | undefined> {
    return await db.query.projects.findFirst({
      where: eq(projects.galleryToken, token),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            businessName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: number, status?: string) {
    const conditions = status
      ? and(eq(projects.userId, userId), eq(projects.status, status))
      : eq(projects.userId, userId);

    return await db.query.projects.findMany({
      where: conditions,
      orderBy: [desc(projects.createdAt)],
    });
  }

  async findByUserIdWithStats(userId: number, status?: string) {
    const whereClause = status
      ? and(eq(projects.userId, userId), eq(projects.status, status))
      : eq(projects.userId, userId);

    const result = await db
      .select({
        project: projects,
        photosCount: count(photos.id),
        selectionsCount: count(selections.id),
      })
      .from(projects)
      .leftJoin(photos, eq(projects.id, photos.projectId))
      .leftJoin(selections, eq(projects.id, selections.projectId))
      .where(whereClause)
      .groupBy(projects.id)
      .orderBy(desc(projects.createdAt));

    return result;
  }

  async update(id: number, data: Partial<NewProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getStats(userId: number) {
    const [stats] = await db
      .select({
        totalProjects: count(projects.id),
        activeProjects: sql<number>`COUNT(CASE WHEN ${projects.status} = 'active' THEN 1 END)`,
        completedProjects: sql<number>`COUNT(CASE WHEN ${projects.status} = 'completed' THEN 1 END)`,
      })
      .from(projects)
      .where(eq(projects.userId, userId));

    return stats;
  }

  async closeGallery(id: number): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ galleryStatus: 'closed', updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async reopenGallery(id: number, userId: number): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ galleryStatus: 'open', updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project;
  }

  async finalizeProject(id: number, userId: number): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project;
  }
}

export const projectRepository = new ProjectRepository();
