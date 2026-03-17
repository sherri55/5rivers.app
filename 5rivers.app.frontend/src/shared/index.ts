/**
 * Shared module - design system, utilities, hooks used across features
 * UI components: use @/components/ui (shadcn)
 */

export { ErrorBoundary } from '@/components/ErrorBoundary'
export { useToast } from '@/hooks/use-toast'
export { useMobile } from '@/hooks/use-mobile'
export { useJobCalculations } from '@/hooks/useJobCalculations'
export {
  SimpleEnhancedSearch,
  useSimpleEnhancedSearch,
  type SimpleFilters,
  type QuickFilter,
} from '@/components/SimpleEnhancedSearch'
