import { ReactNode, forwardRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scaleIn' | 'slideUp';
  delay?: number;
  threshold?: number;
}

const animationClasses = {
  fadeUp: 'animate-slideUp',
  fadeLeft: 'animate-slideInLeft', 
  fadeRight: 'animate-slideInRight',
  scaleIn: 'animate-scaleIn',
  slideUp: 'animate-slideUp'
};

export const AnimatedSection = forwardRef<HTMLDivElement, AnimatedSectionProps>(
  ({ children, className, animation = 'fadeUp', delay = 0, threshold = 0.1 }, ref) => {
    const { ref: animationRef, isVisible } = useScrollAnimation({ threshold });

    return (
      <div
        ref={ref || (animationRef as any)}
        className={cn(
          'transition-all duration-700 ease-out',
          isVisible ? `${animationClasses[animation]} opacity-100` : 'opacity-0 translate-y-8',
          className
        )}
        style={{ 
          animationDelay: isVisible ? `${delay}ms` : '0ms',
          transitionDelay: isVisible ? `${delay}ms` : '0ms'
        }}
      >
        {children}
      </div>
    );
  }
);

AnimatedSection.displayName = 'AnimatedSection';