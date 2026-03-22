import { gql } from '@apollo/client'

// GraphQL mutation for validating and fixing job amounts
export const VALIDATE_AND_FIX_JOB_AMOUNTS = gql`
  mutation ValidateAndFixJobAmounts($invoiceId: ID) {
    validateAndFixJobAmounts(invoiceId: $invoiceId) {
      success
      message
      error
      data {
        totalJobs
        validJobs
        fixedJobs
        errors
      }
    }
  }
`

// Utility function to ensure job amounts are valid
export const validateJobAmounts = async (
  invoiceId: string | null = null,
  apolloClient: any
): Promise<{
  success: boolean;
  message?: string;
  fixedJobs: number;
  errors: string[];
}> => {
  try {
    const { data } = await apolloClient.mutate({
      mutation: VALIDATE_AND_FIX_JOB_AMOUNTS,
      variables: { invoiceId },
      refetchQueries: ['GetInvoices', 'GetInvoice'],
    })

    if (data?.validateAndFixJobAmounts) {
      const result = data.validateAndFixJobAmounts
      return {
        success: result.success,
        message: result.message,
        fixedJobs: result.data?.fixedJobs || 0,
        errors: result.data?.errors || []
      }
    }

    return {
      success: false,
      message: 'No response from validation service',
      fixedJobs: 0,
      errors: ['No response from validation service']
    }
  } catch (error) {
    console.error('Error validating job amounts:', error)
    return {
      success: false,
      message: 'Error validating job amounts',
      fixedJobs: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

// Utility function to validate a specific job amount in the UI
export const validateJobAmount = (jobEntry: any): {
  amount: number;
  isValid: boolean;
  warning?: string;
} => {
  const calculatedAmount = jobEntry.job?.calculatedAmount
  const relationshipAmount = jobEntry.amount
  
  // Prefer calculated amount if available
  if (calculatedAmount !== undefined && calculatedAmount !== null) {
    const difference = Math.abs((relationshipAmount || 0) - calculatedAmount)
    
    if (difference > 0.01) {
      return {
        amount: calculatedAmount,
        isValid: false,
        warning: `Amount mismatch: relationship=$${relationshipAmount?.toFixed(2) || '0.00'}, calculated=$${calculatedAmount.toFixed(2)}`
      }
    }
    
    return {
      amount: calculatedAmount,
      isValid: true
    }
  }
  
  // Fall back to relationship amount
  return {
    amount: relationshipAmount || 0,
    isValid: true
  }
}

// Utility function to format currency with validation warning
export const formatCurrencyWithValidation = (
  jobEntry: any,
  formatCurrency: (amount: number) => string
): {
  formattedAmount: string;
  hasWarning: boolean;
  warning?: string;
} => {
  const validation = validateJobAmount(jobEntry)
  
  return {
    formattedAmount: formatCurrency(validation.amount),
    hasWarning: !validation.isValid,
    warning: validation.warning
  }
}
