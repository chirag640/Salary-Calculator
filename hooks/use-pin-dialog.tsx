"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import PinDialog from "@/components/pin-dialog";

interface PinDialogContextType {
  /**
   * Show the PIN dialog and return a promise that resolves to true if PIN is verified
   * @param options - Custom title and description for the dialog
   * @returns Promise<boolean> - true if PIN verified, false if cancelled
   */
  showPinDialog: (options?: {
    title?: string;
    description?: string;
  }) => Promise<boolean>;
}

const PinDialogContext = createContext<PinDialogContextType | null>(null);

interface PinDialogProviderProps {
  children: ReactNode;
}

/**
 * Provider component that enables the usePinDialog hook
 * 
 * Wrap your app or layout with this provider:
 * ```tsx
 * <PinDialogProvider>
 *   <YourApp />
 * </PinDialogProvider>
 * ```
 */
export function PinDialogProvider({ children }: PinDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("Enter Your PIN");
  const [description, setDescription] = useState("Enter your privacy PIN to continue");
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showPinDialog = useCallback((options?: {
    title?: string;
    description?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setTitle(options?.title || "Enter Your PIN");
      setDescription(options?.description || "Enter your privacy PIN to continue");
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleSuccess = useCallback(() => {
    resolvePromise?.(true);
    setResolvePromise(null);
    setIsOpen(false);
  }, [resolvePromise]);

  const handleClose = useCallback(() => {
    resolvePromise?.(false);
    setResolvePromise(null);
    setIsOpen(false);
  }, [resolvePromise]);

  return (
    <PinDialogContext.Provider value={{ showPinDialog }}>
      {children}
      <PinDialog
        open={isOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        title={title}
        description={description}
      />
    </PinDialogContext.Provider>
  );
}

/**
 * Hook to show the PIN dialog programmatically
 * 
 * Usage:
 * ```tsx
 * const { showPinDialog } = usePinDialog();
 * 
 * const handleAction = async () => {
 *   const verified = await showPinDialog({
 *     title: "Verify Identity",
 *     description: "Enter PIN to view earnings"
 *   });
 *   
 *   if (verified) {
 *     // User entered correct PIN
 *   } else {
 *     // User cancelled or failed
 *   }
 * };
 * ```
 */
export function usePinDialog(): PinDialogContextType {
  const context = useContext(PinDialogContext);
  
  if (!context) {
    throw new Error("usePinDialog must be used within a PinDialogProvider");
  }
  
  return context;
}

// Default export for the hook
export default usePinDialog;
