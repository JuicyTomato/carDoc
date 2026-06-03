'use client'

import { useState, useTransition } from 'react'
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
  grantVehicleAccess,
  updateVehicleAccess,
  revokeVehicleAccess,
} from '@/lib/actions/access'
import type { VehicleAccessRole } from '@/types'

type AccessEntry = {
  userId: string
  role: VehicleAccessRole
  email: string | null
}

function RoleBadge({ role }: { role: VehicleAccessRole }) {
  const config: Record<VehicleAccessRole, { label: string; className: string }> = {
    admin: {
      label: 'Amministratore',
      className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    },
    editor: {
      label: 'Editor',
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
    },
    viewer: {
      label: 'Visualizzatore',
      className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200',
    },
  }
  const { label, className } = config[role] ?? config.viewer
  return <Badge className={className}>{label}</Badge>
}

export default function VehicleAccessSection({
  vehicleId,
  initialAccessList,
  currentUserId,
  isAdmin,
}: {
  vehicleId: string
  initialAccessList: AccessEntry[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [accessList, setAccessList] = useState<AccessEntry[]>(initialAccessList)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantRole, setGrantRole] = useState<VehicleAccessRole>('viewer')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function clearMessages() {
    setError(null)
    setSuccessMsg(null)
  }

  function handleGrant() {
    if (!grantEmail.trim()) return
    clearMessages()
    startTransition(async () => {
      const result = await grantVehicleAccess(vehicleId, grantEmail.trim(), grantRole, currentUserId)
      if (result.success) {
        setGrantEmail('')
        setGrantRole('viewer')
        setSuccessMsg('Accesso concesso con successo')
        setAccessList((prev) => [
          ...prev,
          { userId: crypto.randomUUID(), role: grantRole, email: grantEmail.trim() },
        ])
      } else {
        setError(result.error ?? "Errore durante la concessione dell'accesso")
      }
    })
  }

  function handleRoleChange(targetUserId: string, role: VehicleAccessRole) {
    clearMessages()
    startTransition(async () => {
      try {
        await updateVehicleAccess(vehicleId, targetUserId, role, currentUserId)
        setAccessList((prev) =>
          prev.map((e) => (e.userId === targetUserId ? { ...e, role } : e)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore durante l'aggiornamento")
      }
    })
  }

  function handleRevoke(targetUserId: string) {
    clearMessages()
    startTransition(async () => {
      try {
        await revokeVehicleAccess(vehicleId, targetUserId, currentUserId)
        setAccessList((prev) => prev.filter((e) => e.userId !== targetUserId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la revoca')
      }
    })
  }

  return (
    <div className="space-y-4">
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

      {/* Access list */}
      <div className="space-y-2">
        {accessList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
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
                {isAdmin && entry.userId !== currentUserId ? (
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
                {isAdmin && entry.userId !== currentUserId && (
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

      {/* Grant access form */}
      {isAdmin && (
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
