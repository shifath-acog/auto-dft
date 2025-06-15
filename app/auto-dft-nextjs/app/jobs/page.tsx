'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'react-toastify';

interface Job {
  jobId: number;
  status: string;
  createdAt: string;
  sdfFilePath: string;
  xyzFilePath?: string;
  energy?: number;
  completedAt?: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setJobs(data.jobs);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load jobs: ${err.message}`);
      toast.error(`Failed to load jobs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-20 p-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Your Jobs</h1>
        {jobs.length === 0 ? (
          <p className="text-gray-600">No jobs found. Submit a job using the sidebar.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell>{job.jobId}</TableCell>
                  <TableCell>{job.status}</TableCell>
                  <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Link href={`/jobs/${job.jobId}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {job.status === 'completed' && job.xyzFilePath && (
                      <a
                        href={`/api/files/${encodeURIComponent(job.xyzFilePath)}?download=true`}
                        download
                        className="ml-2"
                      >
                        <Button variant="outline" size="sm">
                          Download XYZ
                        </Button>
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}