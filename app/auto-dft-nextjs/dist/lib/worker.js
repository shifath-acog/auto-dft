"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const db_1 = require("@/lib/db");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const uploadDir = process.env.UPLOAD_DIR || path_1.default.join(process.cwd(), 'uploads');
async function processJob() {
    while (true) {
        try {
            // Fetch the oldest pending job
            const job = await (0, db_1.getPendingJob)();
            if (!job) {
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Sleep for 5 seconds
                continue;
            }
            console.log(`Processing job ${job.jobId} for user ${job.userId}`);
            // Update status to running
            await (0, db_1.updateJobStatus)(job.jobId, 'running');
            const sdfPath = path_1.default.join(uploadDir, job.sdfFilePath);
            const xyzFileName = `job${job.jobId}.xyz`;
            const xyzPath = path_1.default.join(uploadDir, xyzFileName);
            const parameters = JSON.parse(job.parameters);
            const { dielectric, functional, basis, charge } = parameters;
            // Run CLI command in the uploads directory with Poetry environment
            let stdout = '', stderr = '';
            try {
                const cliCommand = `bash -c "source $(poetry env info --path)/bin/activate && run_opt --sdf-file-path ${job.sdfFilePath} --dielectric-constant ${dielectric} --functional ${functional} --basis ${basis} --charge ${charge} --output-dir ${uploadDir}"`;
                const result = await execAsync(cliCommand, { cwd: uploadDir });
                stdout = result.stdout;
                stderr = result.stderr;
            }
            catch (error) {
                const retryCount = await (0, db_1.getRetryCount)(job.jobId);
                if (retryCount < db_1.MAX_RETRIES) {
                    await (0, db_1.incrementRetryCount)(job.jobId);
                    await (0, db_1.updateJobStatus)(job.jobId, 'pending');
                    console.log(`Job ${job.jobId} failed, retrying (${retryCount + 1}/${db_1.MAX_RETRIES})`);
                    continue;
                }
                else {
                    await (0, db_1.updateJobStatus)(job.jobId, 'failed', new Date().toISOString());
                    console.error(`Job ${job.jobId} failed after ${db_1.MAX_RETRIES} retries:`, error);
                    continue;
                }
            }
            // Verify XYZ file exists
            if (!(await fs_extra_1.default.pathExists(xyzPath))) {
                await (0, db_1.updateJobStatus)(job.jobId, 'failed', new Date().toISOString());
                console.error(`Job ${job.jobId} failed: Output file not found at ${xyzPath}`);
                continue;
            }
            // Read XYZ file and parse energy
            const xyzContent = await fs_extra_1.default.readFile(xyzPath, 'utf-8');
            let energy = null;
            const xyzEnergyMatch = xyzContent.match(/Energy: ([\d.-]+) kJ\/mol/);
            if (xyzEnergyMatch) {
                energy = parseFloat(xyzEnergyMatch[1]);
            }
            else {
                const stdoutEnergyMatch = stdout.match(/Optimized geometry with energy: ([\d.-]+) kJ\/mol/);
                if (stdoutEnergyMatch) {
                    energy = parseFloat(stdoutEnergyMatch[1]);
                }
            }
            if (energy === null) {
                await (0, db_1.updateJobStatus)(job.jobId, 'failed', new Date().toISOString());
                console.error(`Job ${job.jobId} failed: Could not parse energy`);
                continue;
            }
            // Update job with results
            await (0, db_1.updateJobResult)(job.jobId, xyzFileName, energy, new Date().toISOString());
            console.log(`Job ${job.jobId} completed successfully`);
        }
        catch (error) {
            console.error('Worker error:', error);
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Sleep before retrying
        }
    }
}
function startWorker() {
    console.log('Starting job processing worker...');
    processJob().catch((error) => {
        console.error('Worker crashed:', error);
        process.exit(1);
    });
}
