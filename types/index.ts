import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import * as schema from '@/db/schema'

// Enum value types
export type OrgMemberRole = (typeof schema.orgMemberRole.enumValues)[number]
export type OrgPlan = (typeof schema.orgPlan.enumValues)[number]
export type VehicleType = (typeof schema.vehicleType.enumValues)[number]
export type VehicleAccessRole = (typeof schema.vehicleAccessRole.enumValues)[number]
export type DocumentType = (typeof schema.documentType.enumValues)[number]
export type FileSource = (typeof schema.fileSource.enumValues)[number]
export type CoverageType = (typeof schema.coverageType.enumValues)[number]
export type NotificationChannel = (typeof schema.notificationChannel.enumValues)[number]

// Organizations
export type Organization = InferSelectModel<typeof schema.organizations>
export type NewOrganization = InferInsertModel<typeof schema.organizations>

export type OrgMember = InferSelectModel<typeof schema.orgMembers>
export type NewOrgMember = InferInsertModel<typeof schema.orgMembers>

// Vehicles
export type Vehicle = InferSelectModel<typeof schema.vehicles>
export type NewVehicle = InferInsertModel<typeof schema.vehicles>

export type VehicleAccess = InferSelectModel<typeof schema.vehicleAccess>
export type NewVehicleAccess = InferInsertModel<typeof schema.vehicleAccess>

// Documents
export type Document = InferSelectModel<typeof schema.documents>
export type NewDocument = InferInsertModel<typeof schema.documents>

export type DocumentFile = InferSelectModel<typeof schema.documentFiles>
export type NewDocumentFile = InferInsertModel<typeof schema.documentFiles>

export type InsuranceDetails = InferSelectModel<typeof schema.insuranceDetails>
export type NewInsuranceDetails = InferInsertModel<typeof schema.insuranceDetails>

export type RevisionDetails = InferSelectModel<typeof schema.revisionDetails>
export type NewRevisionDetails = InferInsertModel<typeof schema.revisionDetails>

export type MaintenanceDetails = InferSelectModel<typeof schema.maintenanceDetails>
export type NewMaintenanceDetails = InferInsertModel<typeof schema.maintenanceDetails>

// Notifications
export type NotificationPref = InferSelectModel<typeof schema.notificationPrefs>
export type NewNotificationPref = InferInsertModel<typeof schema.notificationPrefs>

export type Notification = InferSelectModel<typeof schema.notifications>
export type NewNotification = InferInsertModel<typeof schema.notifications>
