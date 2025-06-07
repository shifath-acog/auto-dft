import Database from 'better-sqlite3';

// Define interfaces for type safety
interface CountRow {
  count: number;
}

interface RetryCountRow {
  retry_count: number;
}

// Initialize SQLite database
const db = new Database(process.env.DATABASE_PATH || '/app/db/jobs.db', { verbose: console.log });

// Enable foreign key constraints
db.exec('PRAGMA foreign_keys = ON');

// Create users table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    )
  `);
} catch (error) {
  console.error('Failed to create users table:', error);
  throw error;
}

// Create jobs table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      job_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      sdf_file_path TEXT NOT NULL,
      xyz_file_path TEXT,
      parameters TEXT NOT NULL,
      energy REAL,
      status TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);
} catch (error) {
  console.error('Failed to create jobs table:', error);
  throw error;
}

// Create index on jobs(status, created_at)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at)
  `);
} catch (error) {
  console.error('Failed to create index on jobs table:', error);
  throw error;
}

export function getDb() {
  return db;
}

export function insertUser(userId: string) {
  try {
    const stmt = db.prepare('INSERT OR IGNORE INTO users (user_id, created_at) VALUES (?, ?)');
    stmt.run(userId, new Date().toISOString());
  } catch (error) {
    console.error(`Failed to insert user ${userId}:`, error);
    throw error;
  }
}

export function insertJob(
  userId: string,
  sdfFilePath: string,
  parameters: { dielectric: string; functional: string; basis: string; charge: string }
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO jobs (user_id, sdf_file_path, parameters, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `);
    const info = stmt.run(userId, sdfFilePath, JSON.stringify(parameters), new Date().toISOString());
    return info.lastInsertRowid as number; // Return job_id
  } catch (error) {
    console.error(`Failed to insert job for user ${userId}:`, error);
    throw error;
  }
}

export function getPendingJob() {
  try {
    return db.prepare("SELECT * FROM jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1").get();
  } catch (error) {
    console.error('Failed to get pending job:', error);
    throw error;
  }
}

export function updateJobStatus(jobId: number, status: string, completedAt?: string) {
  try {
    const stmt = db.prepare('UPDATE jobs SET status=?, completed_at=? WHERE job_id=?');
    stmt.run(status, completedAt || null, jobId);
  } catch (error) {
    console.error(`Failed to update job status for job ${jobId}:`, error);
    throw error;
  }
}

export function updateJobResult(jobId: number, xyzFilePath: string, energy: number, completedAt: string) {
  try {
    const stmt = db.prepare('UPDATE jobs SET xyz_file_path=?, energy=?, status=?, completed_at=? WHERE job_id=?');
    stmt.run(xyzFilePath, energy, 'completed', completedAt, jobId);
  } catch (error) {
    console.error(`Failed to update job result for job ${jobId}:`, error);
    throw error;
  }
}

export function getJobsByUser(userId: string) {
  try {
    return db.prepare('SELECT * FROM jobs WHERE user_id=? ORDER BY created_at DESC').all(userId);
  } catch (error) {
    console.error(`Failed to get jobs for user ${userId}:`, error);
    throw error;
  }
}

export function getJobById(jobId: number, userId: string) {
  try {
    return db.prepare('SELECT * FROM jobs WHERE job_id=? AND user_id=?').get(jobId, userId);
  } catch (error) {
    console.error(`Failed to get job ${jobId} for user ${userId}:`, error);
    throw error;
  }
}

export function countPendingJobs(userId: string): number {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE user_id=? AND status='pending'").get(userId) as CountRow;
    return row.count;
  } catch (error) {
    console.error(`Failed to count pending jobs for user ${userId}:`, error);
    throw error;
  }
}

export function incrementRetryCount(jobId: number) {
  try {
    const stmt = db.prepare('UPDATE jobs SET retry_count=retry_count+1 WHERE job_id=?');
    stmt.run(jobId);
  } catch (error) {
    console.error(`Failed to increment retry count for job ${jobId}:`, error);
    throw error;
  }
}

export function getRetryCount(jobId: number): number {
  try {
    const row = db.prepare('SELECT retry_count FROM jobs WHERE job_id=?').get(jobId) as RetryCountRow | undefined;
    return row?.retry_count ?? 0;
  } catch (error) {
    console.error(`Failed to get retry count for job ${jobId}:`, error);
    throw error;
  }
}

// Maximum retry limit for jobs
export const MAX_RETRIES = 2; // Initial attempt + 2 retries = 3 total attempts