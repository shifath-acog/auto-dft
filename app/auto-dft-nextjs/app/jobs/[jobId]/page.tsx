'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MoleculeViewer from '@/app/components/MoleculeViewer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-toastify';

interface Job {
  jobId: number;
  userId: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  sdfFilePath: string;
  xyzFilePath?: string;
  energy?: number;
  parameters: string; // JSON string of parameters
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch job: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setJob(data.job);
      setError(null);
    } catch (err: any) {
      setError(`Failed to load job details: ${err.message}`);
      toast.error(`Failed to load job details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">{error || 'Job not found'}</div>
      </div>
    );
  }

  const files = [job.sdfFilePath];
  if (job.xyzFilePath) {
    files.push(job.xyzFilePath);
  }

  const parameters = JSON.parse(job.parameters);

  return (
    <div className="container mx-auto mt-20 p-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Job #{job.jobId}</h1>
          <Link href="/jobs">
            <Button variant="outline">Back to Job List</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Job Details</h2>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Created At:</strong> {new Date(job.createdAt).toLocaleString()}</p>
            {job.completedAt && (
              <p><strong>Completed At:</strong> {new Date(job.completedAt).toLocaleString()}</p>
            )}
            <h3 className="text-lg font-medium mt-4">Parameters</h3>
            <p><strong>Dielectric Constant:</strong> {parameters.dielectric}</p>
            <p><strong>Functional:</strong> {parameters.functional}</p>
            <p><strong>Basis:</strong> {parameters.basis}</p>
            <p><strong>Charge:</strong> {parameters.charge}</p>
            {job.status === 'completed' && job.xyzFilePath && (
              <div className="mt-4">
                <a
                  href={`/api/files/${encodeURIComponent(job.xyzFilePath)}?download=true`}
                  download
                >
                  <Button variant="outline">Download XYZ</Button>
                </a>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Molecule Visualization</h2>
            <MoleculeViewer files={files} energy={job.energy} />
          </div>
        </div>
      </Card>
    </div>
  );
}