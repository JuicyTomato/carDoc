CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member',
	"invited_at" timestamp,
	"joined_at" timestamp,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(50) NOT NULL,
	"plan" text DEFAULT 'free',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_access" (
	"vehicle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer',
	"granted_by" uuid,
	"granted_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_access_vehicle_id_user_id_pk" PRIMARY KEY("vehicle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"plate" text,
	"vin" text,
	"color" text,
	"notes" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"source" text NOT NULL,
	"storage_path" text,
	"external_url" text,
	"filename" text,
	"mime_type" text,
	"size_bytes" integer,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"expiry_date" date,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insurance_details" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"provider" text,
	"policy_number" text,
	"coverage_type" text,
	"premium" numeric(10, 2),
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "maintenance_details" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"mileage" integer,
	"cost" numeric(10, 2),
	"workshop" text,
	"service_type" text,
	"next_due_date" date,
	"next_due_mileage" integer,
	"items_replaced" text[]
);
--> statement-breakpoint
CREATE TABLE "revision_details" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"mileage_at_revision" integer,
	"station" text,
	"passed" boolean,
	"next_due_date" date,
	"next_due_mileage" integer
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"days_before" integer[] DEFAULT '{30,7,1}',
	"email_enabled" boolean DEFAULT true,
	"in_app_enabled" boolean DEFAULT true,
	CONSTRAINT "notification_prefs_user_vehicle_unique" UNIQUE("user_id","vehicle_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"type" text DEFAULT 'expiry_warning',
	"channel" text,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_access" ADD CONSTRAINT "vehicle_access_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_details" ADD CONSTRAINT "insurance_details_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_details" ADD CONSTRAINT "maintenance_details_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_details" ADD CONSTRAINT "revision_details_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;