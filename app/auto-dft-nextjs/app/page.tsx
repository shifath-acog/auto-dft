'use client';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FileReaderComponent from './components/FileReaderComponent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Download } from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState<string[]>([]);

  const handleDownloadXyz = async () => {
    // Find the XYZ file
    const xyzFile = files.find(file => file.endsWith('.xyz'));
    if (!xyzFile) {
      alert('No XYZ file available to download.');
      return;
    }

    try {
      const encodedPath = encodeURIComponent(xyzFile);
      const fetchUrl = `/api/files/${encodedPath}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = xyzFile.split('/').pop() || 'molecule.xyz';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error downloading file ${xyzFile}:`, error.message);
      alert(`Failed to download XYZ file: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex flex-1 pt-20">
        {/* Sidebar Container */}
        <div className="fixed left-0 top-16 w-[340px]">
          <Sidebar />
        </div>
        {/* Main Content Container */}
        <main className="flex-1 ml-[340px] p-6 flex items-center justify-content-center">
          <div className="max-w-5xl w-full">
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-gray-800">
                  Molecular Visualization
                </h1>
                {files.some(file => file.endsWith('.xyz')) && (
                 

                  <button
                    onClick={handleDownloadXyz}
                    className="px-2 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition shadow-sm flex items-center justify-center"
                    aria-label="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  
                )}
              </div>
              <FileReaderComponent onFilesUpdate={setFiles} />
            </div>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}