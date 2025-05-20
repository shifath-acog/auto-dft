'use client';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Declare 3Dmol.js global to fix TypeScript error
declare global {
  interface Window {
    $3Dmol: any; // Use 'any' for simplicity; no official types available
  }
}

interface MoleculeViewerProps {
  files: string[]; // Array of file paths (e.g., ["uploads/ethanol.sdf", "uploads/ethanol.xyz"])
  energy?: number; // Energy from /api/run-opt (e.g., -607739.12 kJ/mol)
  height?: string; // Viewer height (e.g., "500px")
  width?: string; // Viewer width (e.g., "800px")
}

export default function MoleculeViewer({
  files,
  energy,
  height = '500px',
  width = '800px',
}: MoleculeViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Categorize files
  const sdfFiles = files.filter(file => file.endsWith('.sdf'));
  const xyzFiles = files.filter(file => file.endsWith('.xyz'));

  const renderMolecules = async (filesToRender: string[]) => {
    if (!viewerRef.current || !window.$3Dmol) {
      setError('Failed to initialize 3Dmol.js viewer');
      return;
    }

    // Clear previous models
    if (viewerInstance.current) {
      viewerInstance.current.clear();
    } else {
      viewerInstance.current = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: 'white',
      });
    }

    if (!viewerInstance.current || typeof viewerInstance.current.setStyle !== 'function') {
      setError('Failed to initialize 3Dmol.js viewer: Viewer creation failed');
      return;
    }

    let hasValidModel = false;
    for (let i = 0; i < filesToRender.length; i++) {
      const filePath = filesToRender[i];
      try {
        const encodedPath = encodeURIComponent(filePath);
        const fetchUrl = `/api/files/${encodedPath}`;
        console.log(`Fetching URL: ${fetchUrl} (original: ${filePath})`);
        const response = await fetch(fetchUrl);
        console.log(`Fetch result for ${filePath}: Status ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();

        // Determine file format
        const ext = filePath.split('.').pop()?.toLowerCase();
        const format = ext === 'xyz' ? 'xyz' : 'sdf';

        // Add model to viewer
        viewerInstance.current.addModel(data, format);

      

        // Set style: Different sphere colors for .sdf and .xyz, sticks with Jmol colors
        // const isSdf = ext === 'sdf';
        // const sphereColor = isSdf ? 'blue' : 'red'; // Blue for .sdf, red for .xyz
        viewerInstance.current.setStyle(
          { model: i },
          {
            stick: { radius: 0.1, opacity: 1.0 },
            sphere: { radius: 0.2, opacity: 1.0 },
          }
        );

        hasValidModel = true;
      } catch (error: any) {
        console.error(`Error loading ${filePath}:`, error);
        setError(`Failed to load ${filePath}: ${error.message}`);
      }
    }

    if (hasValidModel) {
      viewerInstance.current.zoomTo();
      viewerInstance.current.render();
      setError(null);
    } else {
      setError('No valid molecules loaded');
    }
  };

  useEffect(() => {
    // Load 3Dmol.js dynamically
    const script = document.createElement('script');
    script.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = async () => {
      await renderMolecules(activeTab === 'all' ? files : activeTab === 'sdf' ? sdfFiles : xyzFiles);
    };

    script.onerror = () => {
      console.error('Failed to load 3Dmol.js');
      setError('Failed to load 3Dmol.js library');
    };

    return () => {
      document.body.removeChild(script);
      if (viewerInstance.current) {
        viewerInstance.current.clear();
      }
    };
  }, [files]);

  useEffect(() => {
    // Re-render when activeTab changes
    if (window.$3Dmol) {
      renderMolecules(activeTab === 'all' ? files : activeTab === 'sdf' ? sdfFiles : xyzFiles);
    }
  }, [activeTab]);

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-md p-4 max-w-4xl mx-auto">
      {/* Energy Display */}
      {typeof energy === 'number' && (
        <div className="text-sm font-medium text-gray-800 mb-3">
          Energy: {energy.toFixed(2)} kJ/mol
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2 bg-gray-100 p-2 rounded-lg shadow-sm">
          
          <TabsTrigger value="sdf" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Initial Geometry
          </TabsTrigger>
          <TabsTrigger value="xyz" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Optimized Geomtery
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Superposed Geometry
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {error ? (
            <div
              style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              className="bg-gray-50 border border-red-300 rounded-md text-red-600 text-center p-4"
            >
              {error}
            </div>
          ) : (
            <div
              ref={viewerRef}
              style={{ width, height, position: 'relative' }}
              className="border border-gray-200 rounded-md shadow-sm"
            />
          )}
        </TabsContent>
      </Tabs>
    
    </div>
  );
}