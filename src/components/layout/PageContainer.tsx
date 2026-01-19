import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showNav?: boolean;
  className?: string;
  fullHeight?: boolean;
}

export function PageContainer({ 
  children, 
  title, 
  showHeader = true, 
  showNav = true,
  className,
  fullHeight = false
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background pattern-african">
      {showHeader && <Header title={title} />}
      <main 
        className={cn(
          "max-w-lg mx-auto",
          showNav && "pb-20",
          fullHeight ? "min-h-[calc(100vh-3.5rem)]" : "p-4",
          className
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
