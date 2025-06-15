'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import MoleculeViewer from '@/app/components/MoleculeViewer';
import { RefreshCw } from 'lucide-react';

interface Job {
  jobId: number;
  userId: string;
  sdfFilePath: string;
  parameters: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  xyzFilePath?: string;
  energy?: number;
  retryCount: number;
}

interface JobParameters {
  dielectric: string;
  functional: string;
  basis: string;
  charge: string;
}

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [parameters, setParameters] = useState<JobParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this job');
        }
        throw new Error(`Failed to fetch job details: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setJob(data.job);
      try {
        const parsedParams = JSON.parse(data.job.parameters);
        setParameters(parsedParams);
      } catch (err) {
        console.error('Error parsing job parameters:', err);
        setParameters(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }

    // Auto-refresh every 10 seconds if the job is pending or running
    const interval = setInterval(() => {
      if (job && ['pending', 'running'].includes(job.status)) {
        fetchJobDetails();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchJobDetails();
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default'; // Map 'completed' to a valid variant
      case 'pending':
        return 'secondary'; // Map 'pending' to a valid variant
      case 'running':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading && !job) {
    return <div className="p-6 text-center text-gray-500 text-lg">Loading job details...</div>;
  }

  if (error || !job) {
    return (
      <div className="p-6 text-center text-red-600 text-lg">
        {error || 'Job not found'}
        <div className="mt-4">
          <Link href="/jobs">
            <Button
              variant="outline"
              className="border-gray-300 hover:bg-gray-100 transition-all duration-200"
            >
              Back to Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filesToDisplay = [job.sdfFilePath];
  if (job.xyzFilePath) {
    filesToDisplay.push(job.xyzFilePath);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <main className="flex-1 p-8">
        <div className="max-w-4xl w-full mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">Job #{job.jobId}</h1>
                <Badge
                  variant={getStatusVariant(job.status)}
                  className="text-sm font-medium px-3 py-1"
                >
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </Badge>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="flex items-center border-gray-300 hover:bg-gray-100 transition-all duration-200"
                >
                  {isRefreshing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Link href="/jobs">
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-100 transition-all duration-200"
                  >
                    Back to Jobs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Job Metadata */}
            <Card className="mb-8 border-none shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="bg-gray-50 rounded-t-lg">
                <CardTitle className="text-xl font-semibold text-gray-800">Job Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Job ID</p>
                    <p className="text-gray-900 font-medium">{job.jobId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">User ID</p>
                    <p className="text-gray-900 font-medium">{job.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-gray-900 font-medium capitalize">{job.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created At</p>
                    <p className="text-gray-900 font-medium">{new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed At</p>
                    <p className="text-gray-900 font-medium">
                      {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Retry Count</p>
                    <p className="text-gray-900 font-medium">{job.retryCount}</p>
                  </div>
                  
                </div>
              </CardContent>
            </Card>

            {/* Job Parameters */}
            {parameters && (
              <Card className="mb-8 border-none shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                  <CardTitle className="text-xl font-semibold text-gray-800">Job Parameters</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Dielectric Constant</p>
                      <p className="text-gray-900 font-medium">{parameters.dielectric}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Functional</p>
                      <p className="text-gray-900 font-medium">{parameters.functional}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Basis</p>
                      <p className="text-gray-900 font-medium">{parameters.basis}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Charge</p>
                      <p className="text-gray-900 font-medium">{parameters.charge}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Molecular Visualization (only when status is completed) */}
            {job.status.toLowerCase() === 'completed' && filesToDisplay.length > 0 && (
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                  <CardTitle className="text-xl font-semibold text-gray-800">Molecular Visualization</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <MoleculeViewer files={filesToDisplay} energy={job.energy} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}