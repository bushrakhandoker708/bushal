// app/api/comments/route.ts

import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — create a new comment
export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.product_id || !body.body) {
    return NextResponse.json({ error: 'product_id and body are required' }, { status: 400 })
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — edit comment body (user) OR add/edit admin reply (admin)
export async function PATCH(request: Request) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()

  const { data: comment } = await supabase
    .from('comments').select('user_id').eq('id', body.comment_id).single()

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const isAdmin = profile?.role === 'admin'
  const isOwner = comment.user_id === session.user.id

  // Admin editing their reply
  if (body.type === 'reply') {
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await supabase
      .from('comments').update({ admin_reply: body.reply })
      .eq('id', body.comment_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // User editing their own comment body
  if (body.type === 'comment') {
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await supabase
      .from('comments').update({ body: body.body, rating: body.rating ?? null })
      .eq('id', body.comment_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'type must be "comment" or "reply"' }, { status: 400 })
}

// DELETE — user deletes own comment OR admin deletes any comment / clears reply
export async function DELETE(request: Request) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()

  const { data: comment } = await supabase
    .from('comments').select('user_id').eq('id', body.comment_id).single()

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const isAdmin = profile?.role === 'admin'
  const isOwner = comment.user_id === session.user.id

  // Admin clearing just their reply (not deleting the whole comment)
  if (body.type === 'reply' && isAdmin) {
    const { error } = await supabase
      .from('comments').update({ admin_reply: null })
      .eq('id', body.comment_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Delete entire comment — owner or admin only
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('comments').delete().eq('id', body.comment_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}