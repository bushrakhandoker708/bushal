// app/api/comments/route.ts

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/comments — post a new comment on a product
export async function POST(request: Request) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.product_id || !body.body) {
    return NextResponse.json(
      { error: 'product_id and body are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      product_id: body.product_id,
      user_id: session.user.id,
      body: body.body,
      rating: body.rating ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/comments — admin replies to a comment
export async function PATCH(request: Request) {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  if (!body.comment_id || !body.reply) {
    return NextResponse.json(
      { error: 'comment_id and reply are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('comments')
    .update({ admin_reply: body.reply })
    .eq('id', body.comment_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}