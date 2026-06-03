import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrgMembers } from '@/lib/actions/access'
import { getNotificationPrefs } from '@/lib/actions/notifications'
import { getVehicles, getUserOrg } from '@/lib/actions/vehicles'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OrgMembersClient from '@/components/settings/OrgMembersClient'
import VehicleAccessClient from '@/components/settings/VehicleAccessClient'
import NotificationsClient from '@/components/settings/NotificationsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [orgInfo, members, vehicles, notifPrefs] = await Promise.all([
    getUserOrg(user.id),
    getOrgMembers(user.id),
    getVehicles(user.id),
    getNotificationPrefs(user.id),
  ])

  const isOrgAdmin = orgInfo?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci l&apos;organizzazione, gli accessi e le notifiche
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membri organizzazione</TabsTrigger>
          <TabsTrigger value="vehicles">Accessi veicoli</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <OrgMembersClient
            initialMembers={members}
            currentUserId={user.id}
            isAdmin={isOrgAdmin}
          />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <VehicleAccessClient vehicles={vehicles} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsClient currentUserId={user.id} initialPrefs={notifPrefs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
