CREATE TABLE IF NOT EXISTS "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"drive_file_id" varchar(255) NOT NULL,
	"drive_file_name" varchar(255) NOT NULL,
	"original_url" text NOT NULL,
	"thumbnail_url" text,
	"watermarked_url" text,
	"width" integer,
	"height" integer,
	"size_bytes" bigint,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"drive_folder_url" text NOT NULL,
	"drive_folder_id" varchar(255),
	"package_photos_count" integer DEFAULT 10 NOT NULL,
	"additional_photo_price" numeric(10, 2) DEFAULT '50.00' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"gallery_token" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_gallery_token_unique" UNIQUE("gallery_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "selected_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"selection_id" integer NOT NULL,
	"photo_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255) NOT NULL,
	"client_phone" varchar(50),
	"selected_photos_count" integer DEFAULT 0 NOT NULL,
	"additional_photos_count" integer DEFAULT 0 NOT NULL,
	"total_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"phone" varchar(50),
	"business_name" varchar(255),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_project_id_idx" ON "photos" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_gallery_token_idx" ON "projects" ("gallery_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "selected_photos_selection_id_idx" ON "selected_photos" ("selection_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "selected_photos_unique_idx" ON "selected_photos" ("selection_id","photo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "selections_project_id_idx" ON "selections" ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "photos" ADD CONSTRAINT "photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "selected_photos" ADD CONSTRAINT "selected_photos_selection_id_selections_id_fk" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "selected_photos" ADD CONSTRAINT "selected_photos_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "selections" ADD CONSTRAINT "selections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
