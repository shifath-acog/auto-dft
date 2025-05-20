'use client';
import { useEffect, useState } from 'react';
import MoleculeViewer from './MoleculeViewer';

interface FileReaderComponentProps {
  onFilesUpdate?: (files: string[], energy?: number) => void; // Updated callback to include energy
}

export default function FileReaderComponent({ onFilesUpdate }: FileReaderComponentProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [energy, setEnergy] = useState<number | undefined>(undefined); // State for energy
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files/list');
      if (!response.ok) {
        throw new Error(`Failed to fetch file list: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.files && Array.isArray(data.files)) {
        setFiles(data.files);
        onFilesUpdate?.(data.files, energy); // Pass energy along with files
        setError(null);
      } else {
        throw new Error('Invalid file list format');
      }
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err.message}`);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchFiles();
  }, []);

  useEffect(() => {
    // Listen for the 'optimize' event from the Sidebar
    const handleOptimize = (event: Event) => {
      console.log('Optimize event received:', event);
      const customEvent = event as CustomEvent;
      const newEnergy = customEvent.detail?.energy; // Extract energy from event detail
      if (typeof newEnergy === 'number') {
        setEnergy(newEnergy);
        onFilesUpdate?.(files, newEnergy); // Update parent with new energy
      }
      fetchFiles(); // Re-fetch files when a new upload is completed
    };

    window.addEventListener('optimize', handleOptimize);
    return () => window.removeEventListener('optimize', handleOptimize);
  }, [files]); // Add files as dependency to ensure onFilesUpdate uses the latest files

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-gray-500 text-center p-4">
        No molecules found in the uploads folder. Please upload a file using the sidebar.
      </div>
    );
  }

  return (
    <MoleculeViewer files={files} energy={energy} />
  );
}