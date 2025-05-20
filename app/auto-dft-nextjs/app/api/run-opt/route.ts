import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const cliWorkingDir = uploadDir; // Run CLI in the uploads directory

  try {
    // Ensure upload directory exists
    await fs.ensureDir(uploadDir);

    // Clear existing files in /uploads
    await fs.emptyDir(uploadDir);

    // Parse form data
    const formData = await req.formData();
    const sdfFile = formData.get('sdfFile') as File | null;
    const dielectric = formData.get('dielectric') as string | null;
    const functional = formData.get('functional') as string | null;
    const basis = formData.get('basis') as string | null;
    const charge = formData.get('charge') as string | null;

    // Validate inputs
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

    // Sanitize filename
    const sanitize = (input: string) => input.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const originalFileName = sdfFile.name.toLowerCase();
    const sdfFileName = sanitize(originalFileName);
    const sdfPath = path.join(uploadDir, sdfFileName);
    const xyzFileName = sdfFileName.replace('.sdf', '.xyz');
    const xyzPath = path.join(uploadDir, xyzFileName);

    // Save SDF file to uploads directory
    const sdfBuffer = Buffer.from(await sdfFile.arrayBuffer());
    await fs.writeFile(sdfPath, sdfBuffer);

    // Run CLI command in the uploads directory with Poetry environment
    let stdout = '',
      stderr = '';
    try {
      const cliCommand = `bash -c "source $(poetry env info --path)/bin/activate && run_opt --sdf-file-path ${sdfFileName} --dielectric-constant ${dielectric} --functional ${functional} --basis ${basis} --charge ${charge} --output-dir ${uploadDir}"`;
      const result = await execAsync(cliCommand, { cwd: cliWorkingDir });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      await fs.remove(sdfPath);
      return NextResponse.json(
        {
          error: 'Optimization failed',
          details: (error as Error & { stderr?: string }).message,
          stderr: (error as Error & { stderr?: string }).stderr || '',
        },
        { status: 500 }
      );
    }

    // Verify XYZ file exists
    if (!(await fs.pathExists(xyzPath))) {
      await fs.remove(sdfPath);
      return NextResponse.json(
        { error: 'Output file not found', details: `Could not find ${xyzPath}` },
        { status: 500 }
      );
    }

    // Read XYZ file
    let xyzContent: string;
    try {
      xyzContent = await fs.readFile(xyzPath, 'utf-8');
    } catch (error) {
      await fs.remove(sdfPath);
      await fs.remove(xyzPath);
      return NextResponse.json(
        { error: 'Failed to read output file', details: (error as Error).message },
        { status: 500 }
      );
    }

    // Parse energy
    let energy: number | null = null;
    const xyzEnergyMatch = xyzContent.match(/Energy: ([\d.-]+) kJ\/mol/);
    if (xyzEnergyMatch) {
      energy = parseFloat(xyzEnergyMatch[1]);
    } else {
      const stdoutEnergyMatch = stdout.match(/Optimized geometry with energy: ([\d.-]+) kJ\/mol/);
      if (stdoutEnergyMatch) {
        energy = parseFloat(stdoutEnergyMatch[1]);
      }
    }

    if (energy === null) {
      await fs.remove(sdfPath);
      await fs.remove(xyzPath);
      return NextResponse.json(
        { error: 'Failed to parse energy', details: 'Could not extract energy from output' },
        { status: 500 }
      );
    }

    // Return response with file names
    return NextResponse.json({
      energy,
      xyz: xyzContent,
      sdfFileName,
      xyzFileName,
    });
  } catch (error: unknown) {
    const typedError = error as Error & { stderr?: string };
    console.error('Unexpected error:', typedError);
    try {
      await fs.emptyDir(uploadDir);
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    return NextResponse.json(
      {
        error: 'Unexpected server error',
        details: typedError.message || 'Unknown error',
        stderr: typedError.stderr || '',
      },
      { status: 500 }
    );
  }
}