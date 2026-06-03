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
  inviteToOrg,
  updateOrgMemberRole,
  removeFromOrg,
} from '@/lib/actions/access'
import type { OrgMemberRole } from '@/types'

type Member = {
  userId: string
  role: OrgMemberRole
  email: string | null
  joinedAt: Date | null
}

function RoleBadge({ role }: { role: OrgMemberRole }) {
  if (role === 'admin') {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
        Amministratore
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
      Membro
    </Badge>
  )
}

export default function OrgMembersClient({
  initialMembers,
  currentUserId,
  isAdmin,
}: {
  initialMembers: Member[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>('member')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function clearMessages() {
    setError(null)
    setSuccessMsg(null)
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return
    clearMessages()
    startTransition(async () => {
      const result = await inviteToOrg(inviteEmail.trim(), inviteRole, currentUserId)
      if (result.success) {
        setInviteEmail('')
        setInviteRole('member')
        setSuccessMsg('Utente invitato con successo')
        // Optimistically add placeholder — real data appears on refresh
        setMembers((prev) => [
          ...prev,
          {
            userId: crypto.randomUUID(),
            role: inviteRole,
            email: inviteEmail.trim(),
            joinedAt: new Date(),
          },
        ])
      } else {
        setError(result.error ?? 'Errore durante l\'invito')
      }
    })
  }

  function handleRoleChange(targetUserId: string, role: OrgMemberRole) {
    clearMessages()
    startTransition(async () => {
      try {
        await updateOrgMemberRole(targetUserId, role, currentUserId)
        setMembers((prev) =>
          prev.map((m) => (m.userId === targetUserId ? { ...m, role } : m)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento')
      }
    })
  }

  function handleRemove(targetUserId: string) {
    clearMessages()
    startTransition(async () => {
      try {
        await removeFromOrg(targetUserId, currentUserId)
        setMembers((prev) => prev.filter((m) => m.userId !== targetUserId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la rimozione')
      }
    })
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

      {/* Members list */}
      <div className="space-y-2">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nessun membro nell&apos;organizzazione
          </p>
        )}
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.email ?? member.userId}
                </p>
                {member.joinedAt && (
                  <p className="text-xs text-muted-foreground">
                    Membro dal{' '}
                    {new Date(member.joinedAt).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && member.userId !== currentUserId ? (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.userId, v as OrgMemberRole)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Amministratore</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <RoleBadge role={member.role} />
              )}

              {isAdmin && member.userId !== currentUserId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(member.userId)}
                  disabled={isPending}
                >
                  Rimuovi
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite section */}
      {isAdmin && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">Invita utente</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email utente"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={isPending}
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as OrgMemberRole)}
              disabled={isPending}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Amministratore</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}>
              Invita
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
