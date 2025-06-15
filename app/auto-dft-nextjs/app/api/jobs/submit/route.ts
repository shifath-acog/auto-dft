import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { verifyJwt } from '@/lib/auth'; // We'll create this helper
import { insertJob, countPendingJobs } from '@/lib/db';
import { promisify } from 'util';
import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_PENDING_JOBS = 5;

export async function POST(req: NextRequest) {
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

    // Check pending job limit
    const pendingJobsCount = await countPendingJobs(userId);
    if (pendingJobsCount >= MAX_PENDING_JOBS) {
      return NextResponse.json(
        { error: `You have reached the maximum limit of ${MAX_PENDING_JOBS} pending jobs` },
        { status: 429 }
      );
    }

    // Ensure upload directory exists
    await fs.ensureDir(uploadDir);

    // Parse form data
    const formData = await req.formData();
    const sdfFile = formData.get('sdfFile') as File | null;
    const dielectric = formData.get('dielectric') as string | null;
    const functional = formData.get('functional') as string | null;
    const basis = formData.get('basis') as string | null;
    const charge = formData.get('charge') as string | null;

    // Validate inputs (reusing logic from run-opt)
    if (!sdfFile) {
      return NextResponse.json(
        { error: 'No SDF file uploaded', details: 'Please upload a valid .sdf file' },
        { status: 400 }
      );
    }
    if (!sdfFile.name.toLowerCase().endsWith('.sdf')) {
      return NextResponse.json(
        { error: 'Invalid file type', details: 'Only .sdf files are supported' },
        { status: 400 }
      );
    }
    if (sdfFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large', details: 'SDF file must be smaller than 10MB' },
        { status: 400 }
      );
    }
    if (!dielectric) {
      return NextResponse.json(
        { error: 'Dielectric constant missing', details: 'Please provide a dielectric constant' },
        { status: 400 }
      );
    }
    const dielectricNum = parseFloat(dielectric);
    if (isNaN(dielectricNum) || dielectricNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid dielectric constant', details: 'Must be a positive number' },
        { status: 400 }
      );
    }
    if (!functional || !['M06-2X', 'B3LYP', 'PBE'].includes(functional)) {
      return NextResponse.json(
        { error: 'Invalid functional', details: 'Must be M06-2X, B3LYP, or PBE' },
        { status: 400 }
      );
    }
    if (!basis || !['def2-svpd', '6-31G', 'cc-pVDZ'].includes(basis)) {
      return NextResponse.json(
        { error: 'Invalid basis', details: 'Must be def2-svpd, 6-31G, or cc-pVDZ' },
        { status: 400 }
      );
    }
    if (charge === null || charge === '') {
      return NextResponse.json(
        { error: 'Charge missing', details: 'Please provide a charge' },
        { status: 400 }
      );
    }
    const chargeNum = parseInt(charge, 10);
    if (isNaN(chargeNum) || chargeNum.toString() !== charge) {
      return NextResponse.json(
        { error: 'Invalid charge', details: 'Must be an integer' },
        { status: 400 }
      );
    }

    // Validate SDF file format using Open Babel
    const tempFileName = `temp-${Date.now()}.sdf`;
    const tempPath = path.join(uploadDir, tempFileName);
    const sdfBuffer = Buffer.from(await sdfFile.arrayBuffer());
    await fs.writeFile(tempPath, sdfBuffer);

    try {
      await execAsync(`obabel -isdf ${tempPath} -o sdf`);
    } catch (error) {
      await fs.remove(tempPath);
      return NextResponse.json(
        { error: 'Invalid SDF file', details: 'The uploaded file is not a valid SDF format' },
        { status: 400 }
      );
    }
    await fs.remove(tempPath);

    // Insert job into database
    const jobId = await insertJob(userId, '', { dielectric, functional, basis, charge });

    // Save SDF file with job-specific name
    const sdfFileName = `job${jobId}.sdf`;
    const sdfPath = path.join(uploadDir, sdfFileName);
    await fs.writeFile(sdfPath, sdfBuffer);

    // Update job with SDF file path
    await prisma.job.update({
      where: { jobId },
      data: { sdfFilePath: sdfFileName },
    });

    return NextResponse.json({ success: true, jobId }, { status: 200 });
  } catch (error) {
    console.error('Job submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during job submission' },
      { status: 500 }
    );
  }
}