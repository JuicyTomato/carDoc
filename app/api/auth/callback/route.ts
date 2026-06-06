import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { organizations, orgMembers, notificationPrefs } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await ensureUserOnboarded(user.id, user.user_metadata)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

async function ensureUserOnboarded(
  userId: string,
  metadata: Record<string, string>,
) {
  // Check if already has org membership
  const existing = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1)

  if (existing.length > 0) return

  // Create personal org
  const nome = metadata?.nome ?? ''
  const cognome = metadata?.cognome ?? ''
  const displayName = [nome, cognome].filter(Boolean).join(' ') || 'Il mio account'

  const [org] = await db
    .insert(organizations)
    .values({
      name: displayName,
      slug: userId.replace(/-/g, '').slice(0, 50),
    })
    .returning({ id: organizations.id })

  // Add user as admin
  await db.insert(orgMembers).values({
    orgId: org.id,
    userId,
    role: 'admin',
    joinedAt: new Date(),
  })

  // Default notification prefs — email on, 30/7/1 days
  await db.insert(notificationPrefs).values({
    userId,
    vehicleId: null,
    emailEnabled: true,
    daysBefore: [30, 7, 1],
  })
}
