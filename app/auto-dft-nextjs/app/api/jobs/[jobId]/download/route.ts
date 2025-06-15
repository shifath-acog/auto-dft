import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { verifyJwt } from '@/lib/auth';
import { getJobById } from '@/lib/db';

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

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

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job is not completed yet, cannot download results' },
        { status: 400 }
      );
    }

    if (!job.xyzFilePath) {
      return NextResponse.json(
        { error: 'No result file available for this job' },
        { status: 400 }
      );
    }

    const filePath = path.join(uploadDir, job.xyzFilePath);
    if (!(await fs.pathExists(filePath))) {
      return NextResponse.json(
        { error: 'Result file not found on server' },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'chemical/x-xyz',
        'Content-Disposition': `attachment; filename="${job.xyzFilePath}"`,
      },
    });
  } catch (error) {
    console.error('Job download error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while downloading the job result' },
      { status: 500 }
    );
  }
}