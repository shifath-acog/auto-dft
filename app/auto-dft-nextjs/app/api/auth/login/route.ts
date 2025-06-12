import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { authenticate } from 'ldap-authentication';
import { insertUser } from '@/lib/db';

// JWT secret key - should come from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please provide both username and password.' },
        { status: 400 }
      );
    }

    // LDAP Authentication
    let userData = null;
    try {
      const authenticated = await authenticate({
        ldapOpts: { url: process.env.LDAP_URL || 'ldap://ldap.aganitha.ai' },
        userDn: `uid=${username},${process.env.LDAP_BASE_DN || 'ou=people,dc=aganitha,dc=ai'}`,
        userPassword: password,
      });

      if (!authenticated) {
        return NextResponse.json(
          { error: 'Invalid username or password.' },
          { status: 401 }
        );
      }

      userData = {
        username,
        name: username,
        email: username,
      };
    } catch (ldapError) {
      console.error('LDAP authentication error:', ldapError);
      return NextResponse.json(
        { error: 'Failed to authenticate with LDAP server. Please try again later.' },
        { status: 401 }
      );
    }

    // Insert user into the database
    try {
      await insertUser(userData.username);
    } catch (dbError) {
      console.error('Database error during user insertion:', dbError);
      return NextResponse.json(
        { error: 'Failed to save user data. Please try again.' },
        { status: 500 }
      );
    }

    // Create JWT token using jose library
    const token = await new SignJWT({
      id: userData.username,
      username: userData.username,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Set cookie with explicit options
    const cookieStore = cookies();
    (await cookieStore).set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
      secure: true, // Set to true since we're using HTTPS
    });

    console.log('Auth cookie set successfully');

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: userData.username,
        username: userData.username,
        name: userData.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}