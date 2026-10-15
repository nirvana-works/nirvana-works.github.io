import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { generateSessionId, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { adminPassword, date } = body as { adminPassword?: string; date?: string };

    if (!adminPassword || !date) {
      return NextResponse.json(
        { error: 'adminPassword and date are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const sessionId = generateSessionId();
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO sessions (id, date, admin_password, current_round_number, created_at) VALUES (?, ?, ?, 0, ?)',
      args: [sessionId, date, await hashPassword(adminPassword), createdAt],
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const qrUrl = `${baseUrl}/checkin/${sessionId}`;

    return NextResponse.json({ sessionId, date, qrUrl }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
