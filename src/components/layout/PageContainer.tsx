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
    <div className="flex flex-col min-h-screen h-[100dvh] bg-background pattern-african overflow-hidden">
      {showHeader && <Header title={title} />}
      <main 
        className={cn(
          "flex-1 max-w-lg mx-auto w-full overflow-y-auto overscroll-y-contain",
          showNav && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
          fullHeight ? "min-h-[calc(100dvh-3.5rem)]" : "p-4",
          className
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
