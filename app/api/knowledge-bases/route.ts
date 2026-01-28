import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === 'client') {
      return NextResponse.json(
        { error: 'Clients cannot create knowledge bases' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const knowledge_base_name = formData.get('knowledge_base_name') as string;
    const files = formData.getAll('files') as File[];

    if (!knowledge_base_name) {
      return NextResponse.json(
        { error: 'Knowledge base name is required' },
        { status: 400 }
      );
    }

    // Create FormData for Retell API
    const retellFormData = new FormData();
    retellFormData.append('knowledge_base_name', knowledge_base_name);

    // Add all files to the form data
    files.forEach((file) => {
      retellFormData.append('knowledge_base_files', file);
    });

    // Call Retell API to create knowledge base
    const response = await fetch('https://api.retellai.com/create-knowledge-base', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      },
      body: retellFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Retell API error:', error);
      return NextResponse.json(
        { error: 'Failed to create knowledge base in Retell' },
        { status: 500 }
      );
    }

    const knowledgeBase = await response.json();

    return NextResponse.json(knowledgeBase);
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Call Retell API to list knowledge bases
    const response = await fetch('https://api.retellai.com/list-knowledge-bases', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Retell API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch knowledge bases' },
        { status: 500 }
      );
    }

    const knowledgeBases = await response.json();

    return NextResponse.json(knowledgeBases);
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
