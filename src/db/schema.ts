import { pgTable, serial, varchar, text, integer, decimal, timestamp, bigint, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  businessName: varchar('business_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  };
});

// Projects Table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  driveFolderUrl: text('drive_folder_url').notNull(),
  driveFolderId: varchar('drive_folder_id', { length: 255 }),
  packagePhotosCount: integer('package_photos_count').notNull().default(10),
  additionalPhotoPrice: decimal('additional_photo_price', { precision: 10, scale: 2 }).notNull().default('50.00'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  galleryStatus: varchar('gallery_status', { length: 50 }).notNull().default('open'), // open, closed
  galleryToken: varchar('gallery_token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('projects_user_id_idx').on(table.userId),
    galleryTokenIdx: uniqueIndex('projects_gallery_token_idx').on(table.galleryToken),
  };
});

// Photos Table
export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  driveFileId: varchar('drive_file_id', { length: 255 }).notNull(),
  driveFileName: varchar('drive_file_name', { length: 255 }).notNull(),
  originalUrl: text('original_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  watermarkedUrl: text('watermarked_url'),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('photos_project_id_idx').on(table.projectId),
  };
});

// Selections Table
export const selections = pgTable('selections', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }).notNull(),
  clientPhone: varchar('client_phone', { length: 50 }),
  selectedPhotosCount: integer('selected_photos_count').notNull().default(0),
  additionalPhotosCount: integer('additional_photos_count').notNull().default(0),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    projectIdIdx: index('selections_project_id_idx').on(table.projectId),
  };
});

// Selected Photos Table (Join table)
export const selectedPhotos = pgTable('selected_photos', {
  id: serial('id').primaryKey(),
  selectionId: integer('selection_id').notNull().references(() => selections.id, { onDelete: 'cascade' }),
  photoId: integer('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    selectionIdIdx: index('selected_photos_selection_id_idx').on(table.selectionId),
    selectionPhotoIdx: uniqueIndex('selected_photos_unique_idx').on(table.selectionId, table.photoId),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  photos: many(photos),
  selections: many(selections),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  project: one(projects, {
    fields: [photos.projectId],
    references: [projects.id],
  }),
  selectedPhotos: many(selectedPhotos),
}));

export const selectionsRelations = relations(selections, ({ one, many }) => ({
  project: one(projects, {
    fields: [selections.projectId],
    references: [projects.id],
  }),
  selectedPhotos: many(selectedPhotos),
}));

export const selectedPhotosRelations = relations(selectedPhotos, ({ one }) => ({
  selection: one(selections, {
    fields: [selectedPhotos.selectionId],
    references: [selections.id],
  }),
  photo: one(photos, {
    fields: [selectedPhotos.photoId],
    references: [photos.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;

export type Selection = typeof selections.$inferSelect;
export type NewSelection = typeof selections.$inferInsert;

export type SelectedPhoto = typeof selectedPhotos.$inferSelect;
export type NewSelectedPhoto = typeof selectedPhotos.$inferInsert;
