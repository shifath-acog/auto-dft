'use client';
import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

type SortKey = 'jobId' | 'status' | 'createdAt' | 'completedAt' | 'energy';
type SortDirection = 'asc' | 'desc';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        console.log('Fetching jobs from /api/jobs...');
        const response = await fetch('/api/jobs', {
          credentials: 'include',
        });
        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API response:', data);

        if (!Array.isArray(data.jobs)) {
          throw new Error('Invalid response format: Expected "jobs" array');
        }

        setJobs(data.jobs);
        setLoading(false);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(`Failed to load jobs: ${err.message}`);
        toast.error(`Failed to load jobs: ${err.message}`);
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default'; // Map "completed" to "default"
      case 'pending':
        return 'secondary'; // Map "pending" to "secondary"
      case 'running':
        return 'outline'; // Map "running" to "outline"
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredAndSortedJobs = useMemo(() => {
    let filteredJobs = [...jobs];

    // Search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredJobs = filteredJobs.filter((job) =>
        job.jobId.toString().includes(lowerSearchTerm) ||
        job.status.toLowerCase().includes(lowerSearchTerm) ||
        job.parameters.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Sorting
    filteredJobs.sort((a, b) => {
      let valueA: any = a[sortKey];
      let valueB: any = b[sortKey];

      if (sortKey === 'createdAt' || sortKey === 'completedAt') {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      } else if (sortKey === 'energy') {
        valueA = valueA || 0;
        valueB = valueB || 0;
      } else if (sortKey === 'status') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredJobs;
  }, [jobs, searchTerm, sortKey, sortDirection]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-2 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-2 inline" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-2 inline" />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <main className="flex-1 p-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Your Jobs</h1>
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-gray-300 focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-500 text-lg">Loading jobs...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 text-lg">{error}</div>
            ) : filteredAndSortedJobs.length === 0 ? (
              <p className="text-gray-500 text-center text-lg">
                {searchTerm ? 'No jobs match your search.' : 'No jobs found.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('jobId')}>
                        Job ID {renderSortIcon('jobId')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                        Status {renderSortIcon('status')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                        Created At {renderSortIcon('createdAt')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('completedAt')}>
                        Completed At {renderSortIcon('completedAt')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('energy')}>
                        Energy (kJ/mol) {renderSortIcon('energy')}
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedJobs.map((job) => (
                      <TableRow
                        key={job.jobId}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <TableCell className="font-medium text-gray-900">{job.jobId}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(job.status)} className="text-sm font-medium px-3 py-1">
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">{new Date(job.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-gray-700">
                          {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {job.energy ? job.energy.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell>
                          <Link href={`/jobs/${job.jobId}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-300 hover:bg-gray-100 transition-all duration-200"
                            >
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}