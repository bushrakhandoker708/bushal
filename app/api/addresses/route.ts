// app/api/addresses/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

// Fetch all saved addresses for the authenticated user
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  // Fetch addresses, putting the default address at the top
  const { data, error } = await auth.supabase
    .from('addresses')
    .select('*')
    .eq('user_id', auth.userId)
    .order('is_default', { ascending: false }) 
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching addresses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// Create a new saved address
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await request.json()
  const { division, zilla, upazilla, detailed_address, delivery_instructions, is_default } = body

  // Validate required fields
  if (!division || !zilla || !upazilla || !detailed_address) {
    return NextResponse.json({ error: 'Missing required address fields' }, { status: 400 })
  }

  // Insert the new address. 
  // Note: The DB trigger `trg_ensure_single_default_address` will automatically 
  // handle un-setting other default addresses if `is_default` is true.
  const { data, error } = await auth.supabase
    .from('addresses')
    .insert({
      user_id: auth.userId,
      division: division.trim(),
      zilla: zilla.trim(),
      upazilla: upazilla.trim(),
      detailed_address: detailed_address.trim(),
      delivery_instructions: delivery_instructions ? delivery_instructions.trim() : null,
      is_default: is_default ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}