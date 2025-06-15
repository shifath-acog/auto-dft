"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_RETRIES = void 0;
exports.insertUser = insertUser;
exports.insertJob = insertJob;
exports.getPendingJob = getPendingJob;
exports.updateJobStatus = updateJobStatus;
exports.updateJobResult = updateJobResult;
exports.getJobsByUser = getJobsByUser;
exports.getJobById = getJobById;
exports.countPendingJobs = countPendingJobs;
exports.incrementRetryCount = incrementRetryCount;
exports.getRetryCount = getRetryCount;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function insertUser(userId) {
    try {
        await prisma.user.upsert({
            where: { userId },
            update: { createdAt: new Date().toISOString() },
            create: { userId, createdAt: new Date().toISOString() },
        });
    }
    catch (error) {
        console.error(`Failed to insert user ${userId}:`, error);
        throw error;
    }
}
async function insertJob(userId, sdfFilePath, parameters) {
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
    }
    catch (error) {
        console.error(`Failed to insert job for user ${userId}:`, error);
        throw error;
    }
}
async function getPendingJob() {
    try {
        return await prisma.job.findFirst({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });
    }
    catch (error) {
        console.error('Failed to get pending job:', error);
        throw error;
    }
}
async function updateJobStatus(jobId, status, completedAt) {
    try {
        await prisma.job.update({
            where: { jobId },
            data: { status, completedAt },
        });
    }
    catch (error) {
        console.error(`Failed to update job status for job ${jobId}:`, error);
        throw error;
    }
}
async function updateJobResult(jobId, xyzFilePath, energy, completedAt) {
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
    }
    catch (error) {
        console.error(`Failed to update job result for job ${jobId}:`, error);
        throw error;
    }
}
async function getJobsByUser(userId) {
    try {
        return await prisma.job.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    catch (error) {
        console.error(`Failed to get jobs for user ${userId}:`, error);
        throw error;
    }
}
async function getJobById(jobId, userId) {
    try {
        return await prisma.job.findFirst({
            where: { jobId, userId },
        });
    }
    catch (error) {
        console.error(`Failed to get job ${jobId} for user ${userId}:`, error);
        throw error;
    }
}
async function countPendingJobs(userId) {
    try {
        return await prisma.job.count({
            where: { userId, status: 'pending' },
        });
    }
    catch (error) {
        console.error(`Failed to count pending jobs for user ${userId}:`, error);
        throw error;
    }
}
async function incrementRetryCount(jobId) {
    try {
        await prisma.job.update({
            where: { jobId },
            data: { retryCount: { increment: 1 } },
        });
    }
    catch (error) {
        console.error(`Failed to increment retry count for job ${jobId}:`, error);
        throw error;
    }
}
async function getRetryCount(jobId) {
    try {
        const job = await prisma.job.findUnique({
            where: { jobId },
            select: { retryCount: true },
        });
        return job?.retryCount ?? 0;
    }
    catch (error) {
        console.error(`Failed to get retry count for job ${jobId}:`, error);
        throw error;
    }
}
// Maximum retry limit for jobs
exports.MAX_RETRIES = 2; // Initial attempt + 2 retries = 3 total attempts
