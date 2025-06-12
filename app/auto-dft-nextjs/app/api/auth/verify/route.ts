import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// JWT secret key - should match the one used in the login route
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET() {
  try {
    const token = (await cookies()).get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify the token
    await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
  }
}