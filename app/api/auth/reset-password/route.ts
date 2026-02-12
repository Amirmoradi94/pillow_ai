import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_APP_URL' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    });

    if (error) {
      console.error('Reset password error:', error);
    }

    // Always return success to avoid account enumeration
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
