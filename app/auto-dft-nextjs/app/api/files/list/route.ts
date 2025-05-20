import { readdir } from 'fs-extra';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const files = await readdir(uploadDir);

    // Filter for .sdf and .xyz files and prepend 'uploads/' to match the expected file path
    const validFiles = files
      .filter(file => file.endsWith('.sdf') || file.endsWith('.xyz'))
      .map(file => `uploads/${file}`);

    return NextResponse.json({ files: validFiles }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to list files:', error);
    return NextResponse.json(
      { error: 'Failed to list files', details: error.message },
      { status: 500 }
    );
  }
}