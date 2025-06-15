import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
      { algorithms: ['HS256'] }
    );
    return payload as { id: string; username: string };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}