import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl } from '@/lib/actions/files'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { documentId, filename, mimeType } = body

  if (!documentId || !filename) {
    return NextResponse.json({ error: 'documentId and filename are required' }, { status: 400 })
  }

  try {
    const { signedUrl, storagePath } = await getUploadUrl(documentId, filename, mimeType ?? '', user.id)
    return NextResponse.json({ signedUrl, storagePath })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore'
    const status = message === 'Access denied' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
