import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import {
  getPendingJob,
  updateJobStatus,
  updateJobResult,
  incrementRetryCount,
  getRetryCount,
  MAX_RETRIES,
} from './db'; // Changed from '@/lib/db' to './db'

const execAsync = promisify(exec);
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function processJob() {
  while (true) {
    try {
      // Fetch the oldest pending job
      const job = await getPendingJob();
      if (!job) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Sleep for 5 seconds
        continue;
      }

      console.log(`Processing job ${job.jobId} for user ${job.userId}`);

      // Update status to running
      await updateJobStatus(job.jobId, 'running');

      const sdfPath = path.join(uploadDir, job.sdfFilePath);
      const xyzFileName = `job${job.jobId}.xyz`;
      const xyzPath = path.join(uploadDir, xyzFileName);

      const parameters = JSON.parse(job.parameters);
      const { dielectric, functional, basis, charge } = parameters;

      // Run CLI command in the uploads directory with Poetry environment
      let stdout = '',
        stderr = '';
      try {
        const cliCommand = `bash -c "source $(poetry env info --path)/bin/activate && run_opt --sdf-file-path ${job.sdfFilePath} --dielectric-constant ${dielectric} --functional ${functional} --basis ${basis} --charge ${charge} --output-dir ${uploadDir}"`;
        const result = await execAsync(cliCommand, { cwd: uploadDir });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (error) {
        const retryCount = await getRetryCount(job.jobId);
        if (retryCount < MAX_RETRIES) {
          await incrementRetryCount(job.jobId);
          await updateJobStatus(job.jobId, 'pending');
          console.log(`Job ${job.jobId} failed, retrying (${retryCount + 1}/${MAX_RETRIES})`);
          continue;
        } else {
          await updateJobStatus(job.jobId, 'failed', new Date().toISOString());
          console.error(`Job ${job.jobId} failed after ${MAX_RETRIES} retries:`, error);
          continue;
        }
      }

      // Verify XYZ file exists
      if (!(await fs.pathExists(xyzPath))) {
        await updateJobStatus(job.jobId, 'failed', new Date().toISOString());
        console.error(`Job ${job.jobId} failed: Output file not found at ${xyzPath}`);
        continue;
      }

      // Read XYZ file and parse energy
      const xyzContent = await fs.readFile(xyzPath, 'utf-8');
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
        await updateJobStatus(job.jobId, 'failed', new Date().toISOString());
        console.error(`Job ${job.jobId} failed: Could not parse energy`);
        continue;
      }

      // Update job with results
      await updateJobResult(job.jobId, xyzFileName, energy, new Date().toISOString());
      console.log(`Job ${job.jobId} completed successfully`);
    } catch (error) {
      console.error('Worker error:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Sleep before retrying
    }
  }
}

export function startWorker() {
  console.log('Starting job processing worker...');
  processJob().catch((error) => {
    console.error('Worker crashed:', error);
    process.exit(1);
  });
}