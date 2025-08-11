import { NextRequest, NextResponse } from 'next/server';

const ESPN_BASE_URL = 'https://fantasy.espngoal.nl/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;

    if (!playerId || isNaN(Number(playerId))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid playerId. Must be a number.',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        { status: 400 }
      );
    }

    // Authentication: accept Authorization: Bearer <cookie-string>
    // or use env fallback EEF_FORWARD_COOKIE which should contain the ESPN cookie header value
    const authHeader = request.headers.get('authorization');
    const cookieFromAuth = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7)
      : undefined;
    const cookieFromEnv = process.env.EEF_FORWARD_COOKIE;

    const forwardCookie = cookieFromAuth || cookieFromEnv;

    if (!forwardCookie) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Authentication required. Provide Authorization: Bearer <ESPN_COOKIE_STRING> or set EEF_FORWARD_COOKIE env.',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        { status: 401 }
      );
    }

    const targetUrl = `${ESPN_BASE_URL}/my-team/${playerId}/`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      // Pass ESPN cookie string directly
      headers: {
        cookie: forwardCookie,
        'user-agent': request.headers.get('user-agent') || 'EEF-Tool/1.0',
        accept: 'application/json',
      },
      // Avoid Next fetch caching for user data
      cache: 'no-store',
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Upstream responded with ${res.status} ${res.statusText}`,
          details: text?.slice(0, 500) || null,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        { status: res.status }
      );
    }

    // Try to parse JSON; if it fails, return raw text
    try {
      const data = JSON.parse(text);
      return NextResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: text,
        note: 'Response was not valid JSON; returning raw text',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user team',
        details: error?.message || String(error),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      { status: 500 }
    );
  }
} 