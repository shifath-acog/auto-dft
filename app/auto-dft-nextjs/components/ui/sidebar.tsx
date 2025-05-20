'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDropzone } from 'react-dropzone';

export default function Sidebar() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'chemical/x-sdf': ['.sdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setError(null);
      }
    },
  });

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please upload an SDF file');
      toast.error('No SDF file uploaded');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('sdfFile', selectedFile);

      const response = await fetch('/api/run-opt', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('optimize', {
            detail: { ...result, sdfFileName: selectedFile.name },
          })
        );
        toast.success('Optimization completed successfully');
      } else {
        toast.error(`${result.error}: ${result.details}`);
        if (result.stderr) {
          console.error('CLI stderr:', result.stderr);
        }
        setError(`Failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Request failed: ${error.message}`);
      setError('Failed to run optimization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="fixed top-20 left-4 w-[340px] h-[calc(100vh-120px)] p-6 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg overflow-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload SDF File
          </label>
          <div
            {...getRootProps()}
            className="border-dashed border-2 border-gray-300 p-3 rounded-md text-center cursor-pointer hover:bg-gray-50 transition"
          >
            <Input {...getInputProps()} className="hidden" />
            <p className="text-gray-600">
              {selectedFile ? selectedFile.name : 'Drag or click to upload (.sdf)'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </div>
          ) : (
            'Generate'
          )}
        </Button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button
          asChild
          variant="link"
          className="w-full text-gray-600 hover:text-gray-800"
        >
          <a
            href="https://drive.google.com/file/d/136D4uGz6nXkU4fbmSNZj9sTLR-JY7l81/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
          >
            More about MolConSUL
          </a>
        </Button>
      </div>
    </Card>
  );
}