import * as React from "react"

// Breakpoints matching Tailwind's default breakpoints
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export type BreakpointKey = keyof typeof BREAKPOINTS

/**
 * Custom hook to check if the current viewport is below a specific breakpoint
 * @param breakpoint The breakpoint to check against (defaults to 'md')
 * @returns A boolean indicating if the viewport is below the specified breakpoint
 */
export function useIsMobile(breakpoint: BreakpointKey = 'md') {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS[breakpoint])
    }
    
    // Initial check
    checkMobile()
    
    // Add event listener
    window.addEventListener('resize', checkMobile)
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return !!isMobile
}

/**
 * Custom hook to get the current breakpoint
 * @returns The current breakpoint key
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<BreakpointKey | null>(null)

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      
      if (width < BREAKPOINTS.sm) {
        setBreakpoint(null) // below smallest breakpoint
      } else if (width < BREAKPOINTS.md) {
        setBreakpoint('sm')
      } else if (width < BREAKPOINTS.lg) {
        setBreakpoint('md')
      } else if (width < BREAKPOINTS.xl) {
        setBreakpoint('lg')
      } else if (width < BREAKPOINTS['2xl']) {
        setBreakpoint('xl')
      } else {
        setBreakpoint('2xl')
      }
    }
    
    // Initial check
    updateBreakpoint()
    
    // Add event listener
    window.addEventListener('resize', updateBreakpoint)
    
    // Clean up
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}
