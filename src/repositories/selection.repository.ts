import { eq, and, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { selections, selectedPhotos, type Selection, type NewSelection, type NewSelectedPhoto } from '../db/schema.js';

export class SelectionRepository {
  async create(data: NewSelection): Promise<Selection> {
    const [selection] = await db.insert(selections).values(data).returning();
    return selection;
  }

  async findById(id: number) {
    return await db.query.selections.findFirst({
      where: eq(selections.id, id),
      with: {
        project: true,
        selectedPhotos: {
          with: {
            photo: true,
          },
        },
      },
    });
  }

  async findByProjectId(projectId: number) {
    return await db.query.selections.findMany({
      where: eq(selections.projectId, projectId),
      orderBy: [desc(selections.createdAt)],
      with: {
        selectedPhotos: {
          with: {
            photo: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Partial<NewSelection>): Promise<Selection | undefined> {
    const [selection] = await db
      .update(selections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(selections.id, id))
      .returning();
    return selection;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(selections).where(eq(selections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByProjectId(projectId: number): Promise<boolean> {
    const result = await db.delete(selections).where(eq(selections.projectId, projectId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Selected Photos operations
  async addSelectedPhoto(selectionId: number, photoId: number): Promise<void> {
    await db.insert(selectedPhotos).values({ selectionId, photoId });
  }

  async addSelectedPhotos(selectionId: number, photoIds: number[]): Promise<void> {
    const values = photoIds.map((photoId) => ({ selectionId, photoId }));
    await db.insert(selectedPhotos).values(values);
  }

  async removeSelectedPhoto(selectionId: number, photoId: number): Promise<boolean> {
    const result = await db
      .delete(selectedPhotos)
      .where(and(eq(selectedPhotos.selectionId, selectionId), eq(selectedPhotos.photoId, photoId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearSelectedPhotos(selectionId: number): Promise<boolean> {
    const result = await db.delete(selectedPhotos).where(eq(selectedPhotos.selectionId, selectionId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getSelectedPhotos(selectionId: number) {
    return await db.query.selectedPhotos.findMany({
      where: eq(selectedPhotos.selectionId, selectionId),
      with: {
        photo: true,
      },
    });
  }
}

export const selectionRepository = new SelectionRepository();
