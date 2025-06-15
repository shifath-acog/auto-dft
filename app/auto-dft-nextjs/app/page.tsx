'use client';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface User {
  username: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include', // Ensure auth-token cookie is sent
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null); // Fallback to generic message if user fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="fixed left-0 top-16 w-[340px]">
          <Sidebar />
        </div>
        {/* Hero Section */}
        <main className="flex-1 ml-[340px] p-8 flex items-center justify-center">
          <div className="max-w-4xl w-full text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {loading ? 'Loading...' : user ? `Welcome, ${user.username}` : 'Welcome to Auto-DFT'}
            </h1>
            <p className="text-lg text-gray-500 mb-6">
              Submit an SDF file to run DFT optimization and view results.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/jobs">
                <Button
                  variant="outline"
                  className="px-6 py-2 border-gray-300 hover:bg-gray-100 transition-all duration-200 text-gray-800"
                >
                  View Your Jobs
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}