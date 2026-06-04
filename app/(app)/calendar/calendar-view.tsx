'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ExpiringDocumentWithVehicle } from '@/lib/actions/documents'

type Props = {
  docs: ExpiringDocumentWithVehicle[]
  locale: string
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function getUrgency(expiryDateStr: string): 'red' | 'yellow' | 'green' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDateStr)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return 'red'
  if (diffDays <= 30) return 'yellow'
  return 'green'
}

function urgencyDotClass(urgency: 'red' | 'yellow' | 'green'): string {
  if (urgency === 'red') return 'bg-red-500'
  if (urgency === 'yellow') return 'bg-yellow-400'
  return 'bg-green-500'
}

function urgencyBadgeClass(urgency: 'red' | 'yellow' | 'green'): string {
  if (urgency === 'red') return 'bg-red-100 text-red-800 hover:bg-red-100'
  if (urgency === 'yellow') return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  return 'bg-green-100 text-green-800 hover:bg-green-100'
}

function urgencyLabel(urgency: 'red' | 'yellow' | 'green'): string {
  if (urgency === 'red') return 'Urgente'
  if (urgency === 'yellow') return 'In scadenza'
  return 'OK'
}

// Returns Monday-based day offset (0=Mon, 6=Sun)
function getMondayOffset(date: Date): number {
  const day = date.getDay() // 0=Sun, 1=Mon, ...6=Sat
  return day === 0 ? 6 : day - 1
}

export default function CalendarView({ docs, locale: _locale }: Props) {
  const router = useRouter()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )

  function prevMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOffset = getMondayOffset(new Date(year, month, 1))

  // Build a map: dateStr → docs
  const docsByDate = new Map<string, ExpiringDocumentWithVehicle[]>()
  for (const doc of docs) {
    if (!doc.expiryDate) continue
    docsByDate.set(doc.expiryDate, [...(docsByDate.get(doc.expiryDate) ?? []), doc])
  }

  // Docs expiring in current month (for the list below)
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthDocs = docs
    .filter((d) => d.expiryDate?.startsWith(monthStr))
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))

  // Total cells = offset + daysInMonth, rounded up to full weeks
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7

  function handleDocClick(doc: ExpiringDocumentWithVehicle, e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/vehicles/${doc.vehicleId}/docs/${doc.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mese precedente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mese successivo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }, (_, i) => {
            const dayNum = i - firstDayOffset + 1
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth

            if (!isCurrentMonth) {
              return (
                <div
                  key={i}
                  className="min-h-[72px] border-t border-r p-1 bg-muted/20 last:border-r-0"
                />
              )
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const dayDocs = docsByDate.get(dateStr) ?? []
            const isToday =
              dayNum === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear()

            const visibleDocs = dayDocs.slice(0, 3)
            const extraCount = dayDocs.length - visibleDocs.length

            return (
              <div
                key={i}
                className="min-h-[72px] border-t border-r p-1 last:border-r-0"
              >
                <div
                  className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {dayNum}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {visibleDocs.map((doc) => {
                    const urgency = doc.expiryDate ? getUrgency(doc.expiryDate) : 'green'
                    return (
                      <button
                        key={doc.id}
                        onClick={(e) => handleDocClick(doc, e)}
                        title={`${doc.vehicle.make} ${doc.vehicle.model} — ${doc.title}`}
                        className={`w-2 h-2 rounded-full ${urgencyDotClass(urgency)} hover:opacity-70 transition-opacity cursor-pointer`}
                      />
                    )
                  })}
                  {extraCount > 0 && (
                    <span className="text-[9px] text-muted-foreground leading-none self-end">
                      +{extraCount}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Urgente (≤7 giorni)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          In scadenza (8–30 giorni)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          OK (&gt;30 giorni)
        </div>
      </div>

      {/* Monthly list */}
      {monthDocs.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">
            Scadenze di {MONTH_NAMES[month]} {year}
          </h3>
          <div className="space-y-2">
            {monthDocs.map((doc) => {
              const urgency = doc.expiryDate ? getUrgency(doc.expiryDate) : 'green'
              const dayNum = doc.expiryDate
                ? parseInt(doc.expiryDate.split('-')[2], 10)
                : null
              return (
                <Card
                  key={doc.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/vehicles/${doc.vehicleId}/docs/${doc.id}`)}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground w-6 text-right shrink-0">
                          {dayNum ?? '—'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.vehicle.make} {doc.vehicle.model}
                            {doc.vehicle.plate ? ` · ${doc.vehicle.plate}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${urgencyBadgeClass(urgency)} shrink-0 text-xs`}>
                        {urgencyLabel(urgency)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground">
            Nessuna scadenza in {MONTH_NAMES[month]} {year}
          </p>
        </div>
      )}
    </div>
  )
}
