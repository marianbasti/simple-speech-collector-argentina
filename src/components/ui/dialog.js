
import React from 'react';
import { Dialog as ReachDialog } from '@reach/dialog';
import '@reach/dialog/styles.css';

export const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <ReachDialog isOpen={open} onDismiss={() => onOpenChange(false)}>
      {children}
    </ReachDialog>
  );
};

export const DialogContent = ({ children }) => {
  return <div className="p-4">{children}</div>;
};

export const DialogHeader = ({ children }) => {
  return <div className="mb-4">{children}</div>;
};

export const DialogTitle = ({ children }) => {
  return <h2 className="text-xl font-bold">{children}</h2>;
};

export const DialogFooter = ({ children }) => {
  return <div className="mt-4 flex justify-end space-x-2">{children}</div>;
};