'use client'

import { useState, useEffect, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getVehicleAccessList,
  grantVehicleAccess,
  updateVehicleAccess,
  revokeVehicleAccess,
} from '@/lib/actions/access'
import type { Vehicle, VehicleAccessRole } from '@/types'

type AccessEntry = {
  userId: string
  role: VehicleAccessRole
  email: string | null
}

function RoleBadge({ role }: { role: VehicleAccessRole }) {
  const config: Record<VehicleAccessRole, { label: string; className: string }> = {
    admin: { label: 'Amministratore', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200' },
    editor: { label: 'Editor', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' },
    viewer: { label: 'Visualizzatore', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200' },
  }
  const { label, className } = config[role] ?? config.viewer
  return <Badge className={className}>{label}</Badge>
}

export default function VehicleAccessClient({
  vehicles,
  currentUserId,
}: {
  vehicles: Vehicle[]
  currentUserId: string
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    vehicles[0]?.id ?? null,
  )
  const [accessList, setAccessList] = useState<AccessEntry[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<VehicleAccessRole | null>(null)

  const [grantEmail, setGrantEmail] = useState('')
  const [grantRole, setGrantRole] = useState<VehicleAccessRole>('viewer')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function clearMessages() {
    setError(null)
    setSuccessMsg(null)
  }

  async function loadAccess(vehicleId: string) {
    setLoadingAccess(true)
    setError(null)
    try {
      const list = await getVehicleAccessList(vehicleId, currentUserId)
      setAccessList(list)
      const myEntry = list.find((e) => e.userId === currentUserId)
      setCurrentUserRole(myEntry?.role ?? null)
    } catch {
      setError('Errore nel caricamento degli accessi')
      setAccessList([])
      setCurrentUserRole(null)
    } finally {
      setLoadingAccess(false)
    }
  }

  function handleVehicleChange(vehicleId: string) {
    setSelectedVehicleId(vehicleId)
    loadAccess(vehicleId)
  }

  // Load access for the initially selected vehicle
  useEffect(() => {
    if (selectedVehicleId) {
      loadAccess(selectedVehicleId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGrant() {
    if (!selectedVehicleId || !grantEmail.trim()) return
    clearMessages()
    startTransition(async () => {
      const result = await grantVehicleAccess(
        selectedVehicleId,
        grantEmail.trim(),
        grantRole,
        currentUserId,
      )
      if (result.success) {
        setGrantEmail('')
        setGrantRole('viewer')
        setSuccessMsg('Accesso concesso con successo')
        setAccessList((prev) => [
          ...prev,
          {
            userId: crypto.randomUUID(),
            role: grantRole,
            email: grantEmail.trim(),
          },
        ])
      } else {
        setError(result.error ?? 'Errore durante la concessione dell\'accesso')
      }
    })
  }

  function handleRoleChange(targetUserId: string, role: VehicleAccessRole) {
    if (!selectedVehicleId) return
    clearMessages()
    startTransition(async () => {
      try {
        await updateVehicleAccess(selectedVehicleId, targetUserId, role, currentUserId)
        setAccessList((prev) =>
          prev.map((e) => (e.userId === targetUserId ? { ...e, role } : e)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento')
      }
    })
  }

  function handleRevoke(targetUserId: string) {
    if (!selectedVehicleId) return
    clearMessages()
    startTransition(async () => {
      try {
        await revokeVehicleAccess(selectedVehicleId, targetUserId, currentUserId)
        setAccessList((prev) => prev.filter((e) => e.userId !== targetUserId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la revoca')
      }
    })
  }

  const isVehicleAdmin = currentUserRole === 'admin'

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nessun veicolo disponibile
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {successMsg && (
        <Alert>
          <p className="text-sm">{successMsg}</p>
        </Alert>
      )}

      {/* Vehicle selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Veicolo</label>
        <Select
          value={selectedVehicleId ?? ''}
          onValueChange={handleVehicleChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Seleziona veicolo" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.make} {v.model} {v.plate ? `(${v.plate})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Access list */}
      {selectedVehicleId && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Utenti con accesso</h3>
          {loadingAccess ? (
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          ) : accessList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessun accesso configurato
            </p>
          ) : (
            accessList.map((entry) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <p className="text-sm font-medium truncate min-w-0">
                  {entry.email ?? entry.userId}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {isVehicleAdmin && entry.userId !== currentUserId ? (
                    <Select
                      value={entry.role}
                      onValueChange={(v) =>
                        handleRoleChange(entry.userId, v as VehicleAccessRole)
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Amministratore</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Visualizzatore</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={entry.role} />
                  )}

                  {isVehicleAdmin && entry.userId !== currentUserId && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevoke(entry.userId)}
                      disabled={isPending}
                    >
                      Revoca
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Grant access section */}
      {isVehicleAdmin && selectedVehicleId && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">Aggiungi accesso</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email utente"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              disabled={isPending}
              className="flex-1"
            />
            <Select
              value={grantRole}
              onValueChange={(v) => setGrantRole(v as VehicleAccessRole)}
              disabled={isPending}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Amministratore</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visualizzatore</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGrant} disabled={isPending || !grantEmail.trim()}>
              Aggiungi
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
