import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getJobById } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
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
    const jobId = parseInt(params.jobId, 10);

    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Fetch job
    const job = await getJobById(jobId, userId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or you do not have access to it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    console.error('Job details error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching job details' },
      { status: 500 }
    );
  }
}