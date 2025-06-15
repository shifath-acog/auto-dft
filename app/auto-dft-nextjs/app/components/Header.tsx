'use client'
import Image from "next/image";
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Header() {
  const router = useRouter();
  const currentPath = usePathname();

  const handleLogout = async () => {
    // Show a confirmation dialog before proceeding with the logout
    const isConfirmed = window.confirm('Do you want to logout?');
    
    if (!isConfirmed) {
      return; // If user cancels, do nothing
    }

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleHomeRedirect = () => {
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-md z-50 flex items-center justify-between px-4 py-2">
      <div className="flex items-center">
        <Image 
          src="https://www.aganitha.ai/wp-content/uploads/2023/05/aganitha-logo.png"
          alt="Aganitha Logo"
          width={120}
          height={120}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AutoDFT</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          An automated platform to run fast Density Functional Theory (DFT) calculations
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {/* Conditionally render the "Home" button if not on the home page */}
        {currentPath !== '/' && (
          <Button onClick={handleHomeRedirect} variant="outline" size="sm">
            Home
          </Button>
        )}
        {/* Conditionally render the "Logout" button if not on the login page */}
        {currentPath !== '/login' && (
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
