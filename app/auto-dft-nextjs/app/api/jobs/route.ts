import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getJobsByUser } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Verify JWT token
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyJwt(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = user.id;

    // Get optional status filter
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Fetch jobs
    const jobs = await getJobsByUser(userId);
    const filteredJobs = status
      ? jobs.filter((job) => job.status === status)
      : jobs;

    return NextResponse.json({ jobs: filteredJobs }, { status: 200 });
  } catch (error) {
    console.error('Job listing error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching jobs' },
      { status: 500 }
    );
  }
}