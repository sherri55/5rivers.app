import { useMutation } from '@apollo/client'
import { UPDATE_JOB } from '../api'
import { DELETE_JOB } from '@/lib/graphql/mutations'
import { useToast } from '@/hooks/use-toast'

export function useUpdateJob(onSuccess?: () => void) {
  const { toast } = useToast()

  const [updateJob, result] = useMutation(UPDATE_JOB, {
    onCompleted: () => {
      toast({ title: 'Success', description: 'Job updated successfully.' })
      onSuccess?.()
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: `Failed to update job: ${err.message}`,
        variant: 'destructive',
      })
    },
  })

  return { updateJob, ...result }
}

export function useDeleteJob(onSuccess?: () => void) {
  const { toast } = useToast()

  const [deleteJob, result] = useMutation(DELETE_JOB, {
    onCompleted: () => {
      toast({ title: 'Job deleted', description: 'Job has been deleted successfully.' })
      onSuccess?.()
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: `Failed to delete job: ${err.message}`,
        variant: 'destructive',
      })
    },
  })

  return { deleteJob, ...result }
}
