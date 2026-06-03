import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { documentId, filename } = body

  if (!documentId || !filename) {
    return NextResponse.json({ error: 'documentId and filename are required' }, { status: 400 })
  }

  const storagePath = `${user.id}/${documentId}/${filename}`
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUploadUrl(storagePath)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl, storagePath })
}
