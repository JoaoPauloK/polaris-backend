import { eq, and, desc, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import { photos, type Photo, type NewPhoto } from '../db/schema.js';

export class PhotoRepository {
  async create(data: NewPhoto): Promise<Photo> {
    const [photo] = await db.insert(photos).values(data).returning();
    return photo;
  }

  async createMany(data: NewPhoto[]): Promise<Photo[]> {
    return await db.insert(photos).values(data).returning();
  }

  async findById(id: number): Promise<Photo | undefined> {
    return await db.query.photos.findFirst({
      where: eq(photos.id, id),
    });
  }

  async findByProjectId(projectId: number) {
    return await db.query.photos.findMany({
      where: eq(photos.projectId, projectId),
      orderBy: [photos.position, photos.createdAt],
    });
  }

  async findByIds(ids: number[]) {
    return await db.query.photos.findMany({
      where: inArray(photos.id, ids),
    });
  }

  async update(id: number, data: Partial<NewPhoto>): Promise<Photo | undefined> {
    const [photo] = await db
      .update(photos)
      .set(data)
      .where(eq(photos.id, id))
      .returning();
    return photo;
  }

  async updateMany(updates: { id: number; data: Partial<NewPhoto> }[]) {
    const results = await Promise.all(
      updates.map(({ id, data }) => this.update(id, data))
    );
    return results.filter((photo): photo is Photo => photo !== undefined);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByProjectId(projectId: number): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.projectId, projectId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async count(projectId: number): Promise<number> {
    const result = await db.query.photos.findMany({
      where: eq(photos.projectId, projectId),
    });
    return result.length;
  }
}

export const photoRepository = new PhotoRepository();
