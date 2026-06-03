CREATE TYPE "public"."org_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."vehicle_access_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('car', 'moto', 'truck', 'other');--> statement-breakpoint
CREATE TYPE "public"."coverage_type" AS ENUM('RC', 'kasko', 'full');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('insurance', 'revision', 'maintenance', 'tax', 'registration', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_source" AS ENUM('upload', 'external');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."org_member_role";--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DATA TYPE "public"."org_member_role" USING "role"::"public"."org_member_role";--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "invited_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "joined_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'free'::"public"."org_plan";--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "plan" SET DATA TYPE "public"."org_plan" USING "plan"::"public"."org_plan";--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "vehicle_access" ALTER COLUMN "role" SET DEFAULT 'viewer'::"public"."vehicle_access_role";--> statement-breakpoint
ALTER TABLE "vehicle_access" ALTER COLUMN "role" SET DATA TYPE "public"."vehicle_access_role" USING "role"::"public"."vehicle_access_role";--> statement-breakpoint
ALTER TABLE "vehicle_access" ALTER COLUMN "granted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicle_access" ALTER COLUMN "granted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "type" SET DATA TYPE "public"."vehicle_type" USING "type"::"public"."vehicle_type";--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "archived_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "document_files" ALTER COLUMN "source" SET DATA TYPE "public"."file_source" USING "source"::"public"."file_source";--> statement-breakpoint
ALTER TABLE "document_files" ALTER COLUMN "uploaded_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_files" ALTER COLUMN "uploaded_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "type" SET DATA TYPE "public"."document_type" USING "type"::"public"."document_type";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "insurance_details" ALTER COLUMN "coverage_type" SET DATA TYPE "public"."coverage_type" USING "coverage_type"::"public"."coverage_type";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "channel" SET DATA TYPE "public"."notification_channel" USING "channel"::"public"."notification_channel";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "sent_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "sent_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "vehicle_access_vehicle_id_idx" ON "vehicle_access" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_access_user_id_idx" ON "vehicle_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vehicles_org_id_idx" ON "vehicles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "document_files_document_id_idx" ON "document_files" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_vehicle_id_idx" ON "documents" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "documents_expiry_date_idx" ON "documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");