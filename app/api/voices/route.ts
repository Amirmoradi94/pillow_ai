import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://api.retellai.com/list-voices', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch voices from Retell');
      return NextResponse.json(
        { error: 'Failed to fetch voices' },
        { status: 500 }
      );
    }

    const voices = await response.json();
    return NextResponse.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
