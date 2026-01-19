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
  // Calculate the height offset based on header and nav visibility
  const headerHeight = showHeader ? '3.5rem' : '0px';
  const navHeight = showNav ? 'calc(4rem + env(safe-area-inset-bottom))' : '0px';

  return (
    <div className="flex flex-col h-[100dvh] bg-background pattern-african overflow-hidden">
      {showHeader && <Header title={title} />}
      <main 
        className={cn(
          "flex-1 max-w-lg mx-auto w-full overflow-y-auto overscroll-y-contain",
          !fullHeight && "p-4",
          className
        )}
        style={{
          maxHeight: `calc(100dvh - ${headerHeight} - ${navHeight})`,
        }}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
