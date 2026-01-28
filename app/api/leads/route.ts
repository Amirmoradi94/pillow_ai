import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, industry } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create lead using service role client (bypasses RLS for public lead capture)
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('leads')
      // @ts-ignore - Supabase type inference issue
      .insert([
        {
          name,
          email,
          company: company || null,
          industry: industry || null,
          status: 'new',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Lead created successfully', lead: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in leads API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
