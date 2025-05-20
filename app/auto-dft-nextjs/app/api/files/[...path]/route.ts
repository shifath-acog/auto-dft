import { readFile } from 'fs-extra';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);
  // Remove '/api/files/' and normalize path
  let filePath = decodeURIComponent(pathname.replace('/api/files/', ''));
  // Strip 'uploads/' prefix if present
  if (filePath.startsWith('uploads/')) {
    filePath = filePath.replace(/^uploads\//, '');
  }

  try {
    if (!filePath.endsWith('.sdf') && !filePath.endsWith('.xyz')) {
      return NextResponse.json(
        { error: 'Unsupported file type', details: 'Only .sdf and .xyz files are supported' },
        { status: 400 }
      );
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadDir, filePath);

    console.log(`Attempting to read file: ${fullPath}`); // Debug log
    const content = await readFile(fullPath, 'utf-8');
    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error(`Failed to read file ${filePath}:`, error);
    return NextResponse.json(
      { error: 'File not found or inaccessible', details: error.message },
      { status: 404 }
    );
  }
}