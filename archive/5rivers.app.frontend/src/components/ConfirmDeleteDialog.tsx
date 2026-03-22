import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
  showAsButton?: boolean;
}

export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  isLoading = false,
  children,
  showAsButton = true
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          showAsButton ? (
            <Button
              variant="destructive"
              size="sm"
              className="text-white"
            >
              Delete
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
