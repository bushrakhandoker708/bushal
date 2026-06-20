// app/api/comments/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  
  // Validation: product_id is required. Body and rating are optional independently,
  // but at least one must be provided to create a valid comment/rating entry.
  if (!body.product_id) {
    return NextResponse.json({ 
      error: 'product_id is required.' 
    }, { status: 400 })
  }

  if (!body.body && (body.rating === undefined || body.rating === null)) {
    return NextResponse.json({ 
      error: 'Please provide either a comment body or a star rating (or both).' 
    }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      product_id: body.product_id,
      user_id: session.user.id,
      body: body.body ?? null, // Allow null if only rating is provided
      rating: body.rating ?? null, // Allow null if only comment is provided
      is_hidden: false // Default to visible
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // DB trigger handles notifications automatically
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  // Fetch profile to check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Fetch comment to verify ownership or admin rights
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', body.comment_id)
    .single()

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const isAdmin = profile?.role === 'admin'
  const isOwner = comment.user_id === session.user.id

  // Handle Admin Reply
  if (body.type === 'reply') {
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const { data, error } = await supabase
      .from('comments')
      .update({ admin_reply: body.reply })
      .eq('id', body.comment_id)
      .select()
      .single()
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Handle User Editing Their Own Comment/Rating
  if (body.type === 'comment') {
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const { data, error } = await supabase
      .from('comments')
      .update({ 
        body: body.body ?? null, 
        rating: body.rating ?? null // Allow updating rating independently
      })
      .eq('id', body.comment_id)
      .select()
      .single()
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Handle Admin Hiding/Unhiding Comments
  if (body.type === 'hide' && isAdmin) {
    const { data, error } = await supabase
      .from('comments')
      .update({ is_hidden: body.is_hidden })
      .eq('id', body.comment_id)
      .select()
      .single()
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Invalid type. Use "comment", "reply", or "hide".' }, { status: 400 })
}

export async function DELETE(request: Request) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', body.comment_id)
    .single()

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  const isAdmin = profile?.role === 'admin'
  const isOwner = comment.user_id === session.user.id

  // Admin can delete replies without deleting the parent comment
  if (body.type === 'reply' && isAdmin) {
    const { error } = await supabase
      .from('comments')
      .update({ admin_reply: null })
      .eq('id', body.comment_id)
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Only owner or admin can delete the entire comment
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', body.comment_id)
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}