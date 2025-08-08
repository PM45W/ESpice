import React, { useState, useEffect, ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  animationType?: 'fade' | 'slide' | 'scale' | 'bounce';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
  animationType = 'fade',
  duration = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  const getAnimationClass = () => {
    switch (animationType) {
      case 'slide':
        return isVisible ? 'slide-in-right' : 'page-enter';
      case 'scale':
        return isVisible ? 'scale-in' : 'page-enter';
      case 'bounce':
        return isVisible ? 'bounce-in' : 'page-enter';
      case 'fade':
      default:
        return isVisible ? 'fade-in' : 'page-enter';
    }
  };

  return (
    <div
      className={`page-transition-container ${getAnimationClass()} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

// Hook for page transitions
export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
  };

  const endTransition = () => {
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  return { isTransitioning, startTransition, endTransition };
};

// Higher-order component for page transitions
export const withPageTransition = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  animationType: 'fade' | 'slide' | 'scale' | 'bounce' = 'fade'
) => {
  return (props: P) => (
    <PageTransition animationType={animationType}>
      <WrappedComponent {...props} />
    </PageTransition>
  );
};

// Animation utilities
export const animationUtils = {
  fadeIn: 'fade-in',
  slideInRight: 'slide-in-right',
  slideInLeft: 'slide-in-left',
  scaleIn: 'scale-in',
  bounceIn: 'bounce-in',
  slideUp: 'slide-up',
  pulse: 'pulse',
  shake: 'shake',
  contentFadeIn: 'content-fade-in'
};

export default PageTransition; 