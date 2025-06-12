import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function insertUser(userId: string) {
  try {
    await prisma.user.upsert({
      where: { userId },
      update: { createdAt: new Date().toISOString() },
      create: { userId, createdAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error(`Failed to insert user ${userId}:`, error);
    throw error;
  }
}

export async function insertJob(
  userId: string,
  sdfFilePath: string,
  parameters: { dielectric: string; functional: string; basis: string; charge: string }
) {
  try {
    const job = await prisma.job.create({
      data: {
        userId,
        sdfFilePath,
        parameters: JSON.stringify(parameters),
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
    return job.jobId;
  } catch (error) {
    console.error(`Failed to insert job for user ${userId}:`, error);
    throw error;
  }
}

export async function getPendingJob() {
  try {
    return await prisma.job.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    console.error('Failed to get pending job:', error);
    throw error;
  }
}

export async function updateJobStatus(jobId: number, status: string, completedAt?: string) {
  try {
    await prisma.job.update({
      where: { jobId },
      data: { status, completedAt },
    });
  } catch (error) {
    console.error(`Failed to update job status for job ${jobId}:`, error);
    throw error;
  }
}

export async function updateJobResult(jobId: number, xyzFilePath: string, energy: number, completedAt: string) {
  try {
    await prisma.job.update({
      where: { jobId },
      data: {
        xyzFilePath,
        energy,
        status: 'completed',
        completedAt,
      },
    });
  } catch (error) {
    console.error(`Failed to update job result for job ${jobId}:`, error);
    throw error;
  }
}

export async function getJobsByUser(userId: string) {
  try {
    return await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error(`Failed to get jobs for user ${userId}:`, error);
    throw error;
  }
}

export async function getJobById(jobId: number, userId: string) {
  try {
    return await prisma.job.findFirst({
      where: { jobId, userId },
    });
  } catch (error) {
    console.error(`Failed to get job ${jobId} for user ${userId}:`, error);
    throw error;
  }
}

export async function countPendingJobs(userId: string): Promise<number> {
  try {
    return await prisma.job.count({
      where: { userId, status: 'pending' },
    });
  } catch (error) {
    console.error(`Failed to count pending jobs for user ${userId}:`, error);
    throw error;
  }
}

export async function incrementRetryCount(jobId: number) {
  try {
    await prisma.job.update({
      where: { jobId },
      data: { retryCount: { increment: 1 } },
    });
  } catch (error) {
    console.error(`Failed to increment retry count for job ${jobId}:`, error);
    throw error;
  }
}

export async function getRetryCount(jobId: number): Promise<number> {
  try {
    const job = await prisma.job.findUnique({
      where: { jobId },
      select: { retryCount: true },
    });
    return job?.retryCount ?? 0;
  } catch (error) {
    console.error(`Failed to get retry count for job ${jobId}:`, error);
    throw error;
  }
}

// Maximum retry limit for jobs
export const MAX_RETRIES = 2; // Initial attempt + 2 retries = 3 total attempts