'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';

export default function Sidebar() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dielectric, setDielectric] = useState('78.5');
  const [functional, setFunctional] = useState('M06-2X');
  const [basis, setBasis] = useState('def2-svpd');
  const [charge, setCharge] = useState('0');

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'chemical/x-sdf': ['.sdf'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setErrors((prev) => ({ ...prev, sdfFile: '' }));
        toast.success('File uploaded successfully'); // Add success message
      }
    },
  });

  const validateInputs = () => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedFile) newErrors.sdfFile = 'Please upload an SDF file';
    if (!dielectric) {
      newErrors.dielectric = 'Dielectric constant is required';
    } else if (isNaN(Number(dielectric)) || Number(dielectric) <= 0) {
      newErrors.dielectric = 'Must be a positive number';
    }
    if (!functional) newErrors.functional = 'Functional is required';
    if (!basis) newErrors.basis = 'Basis is required';
    if (charge === '') {
      newErrors.charge = 'Charge is required';
    } else if (!Number.isInteger(Number(charge))) {
      newErrors.charge = 'Must be an integer';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('sdfFile', selectedFile!);
      formData.append('dielectric', dielectric);
      formData.append('functional', functional);
      formData.append('basis', basis);
      formData.append('charge', charge);

      const response = await fetch('/api/run-opt', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('optimize', {
            detail: result,
          })
        );
        toast.success('Optimization completed successfully');
      } else {
        toast.error(`${result.error}: ${result.details}`);
        if (result.stderr) {
          console.error('CLI stderr:', result.stderr);
        }
        setErrors({ api: `Failed: ${result.error}` });
      }
    } catch (error: any) {
      toast.error(`Request failed: ${error.message}`);
      setErrors({ api: 'Failed to run optimization. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="fixed top-20 left-4 w-[340px] h-[calc(100vh-120px)] p-6 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg overflow-auto">
      <div className="space-y-4">
        <div>
          <Label htmlFor="sdfFile" className="block text-sm font-medium text-gray-700 mb-1">
            Upload SDF File
          </Label>
          <div
            {...getRootProps()}
            className="border-dashed border-2 border-gray-300 p-3 rounded-md text-center cursor-pointer hover:bg-gray-50 transition"
          >
            <Input {...getInputProps()} id="sdfFile" className="hidden" />
            <p className="text-gray-600 truncate">
              {selectedFile ? selectedFile.name : 'Drag or click to upload (.sdf)'}
            </p>
          </div>
          {errors.sdfFile && <p className="text-red-600 text-sm mt-1">{errors.sdfFile}</p>}
        </div>
        <div>
          <Label htmlFor="dielectric" className="block text-sm font-medium text-gray-700 mb-1">
            Dielectric Constant
          </Label>
          <Input
            id="dielectric"
            type="number"
            step="0.1"
            value={dielectric}
            onChange={(e) => {
              setDielectric(e.target.value);
              setErrors((prev) => ({ ...prev, dielectric: '' }));
            }}
            className="w-full"
            placeholder="e.g., 78.5"
          />
          {errors.dielectric && <p className="text-red-600 text-sm mt-1">{errors.dielectric}</p>}
        </div>
        <div>
          <Label htmlFor="functional" className="block text-sm font-medium text-gray-700 mb-1">
            Functional
          </Label>
          <Select
            value={functional}
            onValueChange={(value) => {
              setFunctional(value);
              setErrors((prev) => ({ ...prev, functional: '' }));
            }}
          >
            <SelectTrigger id="functional" className="w-full">
              <SelectValue placeholder="Select functional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M06-2X">M06-2X</SelectItem>
              <SelectItem value="B3LYP">B3LYP</SelectItem>
              <SelectItem value="PBE">PBE</SelectItem>
            </SelectContent>
          </Select>
          {errors.functional && <p className="text-red-600 text-sm mt-1">{errors.functional}</p>}
        </div>
        <div>
          <Label htmlFor="basis" className="block text-sm font-medium text-gray-700 mb-1">
            Basis
          </Label>
          <Select
            value={basis}
            onValueChange={(value) => {
              setBasis(value);
              setErrors((prev) => ({ ...prev, basis: '' }));
            }}
          >
            <SelectTrigger id="basis" className="w-full">
              <SelectValue placeholder="Select basis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="def2-svpd">def2-svpd</SelectItem>
              <SelectItem value="6-31G">6-31G</SelectItem>
              <SelectItem value="cc-pVDZ">cc-pVDZ</SelectItem>
            </SelectContent>
          </Select>
          {errors.basis && <p className="text-red-600 text-sm mt-1">{errors.basis}</p>}
        </div>
        <div>
          <Label htmlFor="charge" className="block text-sm font-medium text-gray-700 mb-1">
            Charge
          </Label>
          <Input
            id="charge"
            type="number"
            step="1"
            value={charge}
            onChange={(e) => {
              setCharge(e.target.value);
              setErrors((prev) => ({ ...prev, charge: '' }));
            }}
            className="w-full"
            placeholder="e.g., 0"
          />
          {errors.charge && <p className="text-red-600 text-sm mt-1">{errors.charge}</p>}
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
            'Optimize'
          )}
        </Button>
        {errors.api && <p className="text-red-600 text-sm">{errors.api}</p>}
      </div>
    </Card>
  );
}