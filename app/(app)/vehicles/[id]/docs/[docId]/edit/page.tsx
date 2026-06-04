import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getDocument,
  getInsuranceDetails,
  getRevisionDetails,
  getMaintenanceDetails,
} from '@/lib/actions/documents'
import EditDocumentForm from './EditDocumentForm'

export default async function EditDocumentPage({
  params,
}: {
  params: { id: string; docId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const doc = await getDocument(params.docId, user.id).catch(() => null)
  if (!doc) notFound()

  const [insuranceDetailsData, revisionDetailsData, maintenanceDetailsData] = await Promise.all([
    doc.type === 'insurance'
      ? getInsuranceDetails(params.docId, user.id).catch(() => null)
      : Promise.resolve(null),
    doc.type === 'revision'
      ? getRevisionDetails(params.docId, user.id).catch(() => null)
      : Promise.resolve(null),
    doc.type === 'maintenance'
      ? getMaintenanceDetails(params.docId, user.id).catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <EditDocumentForm
      vehicleId={params.id}
      docId={params.docId}
      userId={user.id}
      docType={doc.type}
      defaultValues={{
        title: doc.title,
        notes: doc.notes ?? '',
        expiryDate: doc.expiryDate ?? '',
        isActive: doc.isActive ?? true,
        insurance: insuranceDetailsData
          ? {
              provider: insuranceDetailsData.provider ?? '',
              policyNumber: insuranceDetailsData.policyNumber ?? '',
              coverageType: (insuranceDetailsData.coverageType ?? 'RC') as 'RC' | 'kasko' | 'full',
              premium: insuranceDetailsData.premium
                ? String(insuranceDetailsData.premium)
                : '',
              startDate: insuranceDetailsData.startDate ?? '',
              endDate: insuranceDetailsData.endDate ?? '',
            }
          : undefined,
        revision: revisionDetailsData
          ? {
              mileageAtRevision: revisionDetailsData.mileageAtRevision?.toString() ?? '',
              station: revisionDetailsData.station ?? '',
              passed: revisionDetailsData.passed ?? true,
              nextDueDate: revisionDetailsData.nextDueDate ?? '',
              nextDueMileage: revisionDetailsData.nextDueMileage?.toString() ?? '',
            }
          : undefined,
        maintenance: maintenanceDetailsData
          ? {
              mileage: maintenanceDetailsData.mileage?.toString() ?? '',
              cost: maintenanceDetailsData.cost ? String(maintenanceDetailsData.cost) : '',
              workshop: maintenanceDetailsData.workshop ?? '',
              serviceType: maintenanceDetailsData.serviceType ?? '',
              nextDueDate: maintenanceDetailsData.nextDueDate ?? '',
              nextDueMileage: maintenanceDetailsData.nextDueMileage?.toString() ?? '',
              itemsReplaced: maintenanceDetailsData.itemsReplaced?.join(', ') ?? '',
            }
          : undefined,
      }}
    />
  )
}
