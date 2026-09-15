import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal component implementing the signature motion design:
 * "staggered scroll reveal + fade-up + subtle scale" (inspired by Marby luxury aesthetic).
 * 
 * @param {React.ReactNode} children - Elements to animate
 * @param {number} delay - Animation delay in milliseconds (e.g. idx * 100 for staggered grids)
 * @param {number} y - Initial translateY distance in px (default: 28)
 * @param {number} scale - Initial scale (default: 0.96 for subtle scale)
 * @param {number} duration - Animation duration in seconds (default: 0.75)
 * @param {string} className - Additional CSS class names
 * @param {boolean} once - If true, animation triggers only once when entering viewport (default: true)
 * @param {number} threshold - IntersectionObserver threshold (default: 0.1)
 * @param {string} rootMargin - IntersectionObserver rootMargin (default: '0px 0px -40px 0px')
 * @param {string} as - HTML tag to render (default: 'div')
 */
export function ScrollReveal({
  children,
  delay = 0,
  y = 28,
  scale = 0.96,
  duration = 0.75,
  className = '',
  once = true,
  threshold = 0.1,
  rootMargin = '0px 0px -40px 0px',
  as: Component = 'div',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Respect user's motion preferences
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [once, threshold, rootMargin]);

  const style = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? 'translate3d(0, 0, 0) scale(1)'
      : `translate3d(0, ${y}px, 0) scale(${scale})`,
    transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
    transitionDelay: `${delay}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform'
  };

  return (
    <Component
      ref={ref}
      style={style}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
