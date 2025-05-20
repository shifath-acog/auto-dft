import type { NextApiRequest, NextApiResponse } from 'next';
import { readdir } from 'fs/promises';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const files = await readdir(uploadDir);
    res.status(200).json(files);
  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
}