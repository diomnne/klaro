'use client';

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

type NewDraftButtonProps = {
  /** Nothing to discard yet. */
  disabled: boolean;
  onConfirm: () => void;
};

/**
 * Starts over, after asking. The dialog is an alert dialog, so Cancel gets focus
 * first: pressing Enter by reflex keeps the draft, not discards it.
 */
export function NewDraftButton({ disabled, onConfirm }: NewDraftButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="h-11 sm:h-8"
          disabled={disabled}
          size="default"
          type="button"
          variant="ghost"
        >
          Start a new draft
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new draft?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current conversation will be discarded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant="destructive">
            Start a new draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
