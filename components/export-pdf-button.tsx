'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DocData {
  title: string
  type: string
  typeLabel: string
  expiryDate: string | null
  notes: string | null
  vehicleName: string
  insurance?: {
    provider?: string | null
    policyNumber?: string | null
    coverageType?: string | null
    premium?: string | null
    startDate?: string | null
    endDate?: string | null
  } | null
  revision?: {
    mileageAtRevision?: number | null
    station?: string | null
    passed?: boolean | null
    nextDueDate?: string | null
    nextDueMileage?: number | null
  } | null
  maintenance?: {
    mileage?: number | null
    cost?: string | null
    workshop?: string | null
    serviceType?: string | null
    nextDueDate?: string | null
    nextDueMileage?: number | null
    itemsReplaced?: string[] | null
  } | null
}

function formatDateItalian(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function coverageTypeLabel(type: string | null | undefined): string {
  if (!type) return '-'
  switch (type) {
    case 'RC': return 'Responsabilità Civile'
    case 'kasko': return 'Kasko'
    case 'full': return 'Kasko Completa'
    default: return type
  }
}

interface ExportPdfButtonProps {
  docData: DocData
}

export function ExportPdfButton({ docData }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // Header background
      pdf.setFillColor(17, 24, 39)
      pdf.rect(0, 0, pageWidth, 28, 'F')

      // carDoc title
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(255, 255, 255)
      pdf.text('carDoc', margin, 17)

      // Vehicle name + doc title
      pdf.setFontSize(10)
      pdf.setTextColor(180, 190, 200)
      pdf.text(docData.vehicleName, margin + 48, 12)
      pdf.setFontSize(11)
      pdf.setTextColor(220, 230, 240)
      pdf.text(docData.title, margin + 48, 20)

      y = 40

      // Document type badge area
      pdf.setFillColor(243, 244, 246)
      pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(31, 41, 55)
      pdf.text(docData.typeLabel.toUpperCase(), margin + 6, y + 9.5)

      y += 22

      // Fields helper
      const addSection = (title: string, rows: [string, string][]) => {
        // Section title
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.setTextColor(99, 102, 241)
        pdf.text(title, margin, y)
        y += 6

        // Divider line
        pdf.setDrawColor(220, 220, 230)
        pdf.setLineWidth(0.4)
        pdf.line(margin, y, margin + contentWidth, y)
        y += 5

        const labelWidth = 60

        rows.forEach(([label, value]) => {
          if (!value || value === '-') return

          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(107, 114, 128)
          pdf.text(label, margin, y)

          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(17, 24, 39)

          // Wrap long values
          const lines = pdf.splitTextToSize(value, contentWidth - labelWidth)
          pdf.text(lines as string[], margin + labelWidth, y)
          y += Math.max(6, (lines as string[]).length * 5)
        })

        y += 4
      }

      // General info
      addSection('INFORMAZIONI GENERALI', [
        ['Tipo documento', docData.typeLabel],
        ['Titolo', docData.title],
        ['Scadenza', formatDateItalian(docData.expiryDate)],
        ['Note', docData.notes ?? '-'],
      ])

      // Insurance details
      if (docData.insurance) {
        const ins = docData.insurance
        addSection('DETTAGLI ASSICURAZIONE', [
          ['Compagnia', ins.provider ?? '-'],
          ['Numero polizza', ins.policyNumber ?? '-'],
          ['Tipo copertura', coverageTypeLabel(ins.coverageType)],
          ['Premio annuale', ins.premium ? `€ ${Number(ins.premium).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'],
          ['Data inizio', formatDateItalian(ins.startDate)],
          ['Data fine', formatDateItalian(ins.endDate)],
        ])
      }

      // Revision details
      if (docData.revision) {
        const rev = docData.revision
        addSection('DETTAGLI REVISIONE', [
          ['Chilometraggio', rev.mileageAtRevision != null ? `${rev.mileageAtRevision.toLocaleString('it-IT')} km` : '-'],
          ['Centro revisione', rev.station ?? '-'],
          ['Esito', rev.passed == null ? '-' : rev.passed ? 'Superata' : 'Non superata'],
          ['Prossima scadenza', formatDateItalian(rev.nextDueDate)],
          ['Prossima scadenza (km)', rev.nextDueMileage != null ? `${rev.nextDueMileage.toLocaleString('it-IT')} km` : '-'],
        ])
      }

      // Maintenance details
      if (docData.maintenance) {
        const mnt = docData.maintenance
        const rows: [string, string][] = [
          ['Chilometraggio', mnt.mileage != null ? `${mnt.mileage.toLocaleString('it-IT')} km` : '-'],
          ['Costo', mnt.cost ? `€ ${Number(mnt.cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'],
          ['Officina', mnt.workshop ?? '-'],
          ['Tipo intervento', mnt.serviceType ?? '-'],
          ['Prossima scadenza', formatDateItalian(mnt.nextDueDate)],
          ['Prossima scadenza (km)', mnt.nextDueMileage != null ? `${mnt.nextDueMileage.toLocaleString('it-IT')} km` : '-'],
        ]
        if (mnt.itemsReplaced && mnt.itemsReplaced.length > 0) {
          rows.push(['Parti sostituite', mnt.itemsReplaced.join(', ')])
        }
        addSection('DETTAGLI TAGLIANDO', rows)
      }

      // Footer
      const pageHeight = pdf.internal.pageSize.getHeight()
      const today = new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      pdf.setFillColor(243, 244, 246)
      pdf.rect(0, pageHeight - 14, pageWidth, 14, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Generato il ${today}`, margin, pageHeight - 5.5)
      pdf.text('carDoc', pageWidth - margin, pageHeight - 5.5, { align: 'right' })

      // Filename
      const safeVehicle = docData.vehicleName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const safeType = docData.type.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `${safeVehicle}-${safeType}-${dateStr}.pdf`

      pdf.save(filename)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <FileDown className="mr-1.5 h-3.5 w-3.5" />
      {loading ? 'Generazione...' : 'Esporta PDF'}
    </Button>
  )
}
