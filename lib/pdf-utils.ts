/**
 * PDF Utility Functions
 * 
 * Helpers for generating PDF filenames and other PDF-related operations.
 */

/**
 * Sanitize a string for use in a filename
 * Removes special characters that are invalid in filenames
 */
function sanitizeForFilename(str: string): string {
  return str
    .trim()
    // Remove characters that are invalid in Windows/Unix filenames
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length to prevent overly long filenames
    .substring(0, 50);
}

/**
 * Generate a sanitized PDF filename
 * 
 * Format:
 * - With profile name: `YYYY-MM-DD_ProfileName.pdf`
 * - Without profile name: `YYYY-MM-DD.pdf`
 * 
 * @param date - Date string in YYYY-MM-DD format
 * @param profileName - Optional user profile name
 * @returns Sanitized PDF filename
 * 
 * @example
 * generatePdfFileName('2026-01-22', 'Chirag Chaudhary')
 * // Returns: '2026-01-22_Chirag_Chaudhary.pdf'
 * 
 * @example
 * generatePdfFileName('2026-01-22', null)
 * // Returns: '2026-01-22.pdf'
 * 
 * @example
 * generatePdfFileName('2026-01-22', '  ')
 * // Returns: '2026-01-22.pdf' (whitespace-only name is treated as empty)
 */
export function generatePdfFileName(
  date: string,
  profileName?: string | null
): string {
  // Ensure date is in valid format (only allow digits and hyphens)
  const sanitizedDate = date.replace(/[^0-9-]/g, '');
  
  // Check if profileName is provided and not just whitespace
  if (!profileName || profileName.trim() === '') {
    return `${sanitizedDate}.pdf`;
  }
  
  // Sanitize the profile name for use in filename
  const sanitizedName = sanitizeForFilename(profileName);
  
  // If sanitization results in empty string, return date-only filename
  if (!sanitizedName) {
    return `${sanitizedDate}.pdf`;
  }
  
  return `${sanitizedDate}_${sanitizedName}.pdf`;
}

/**
 * Get the display name for a user from profile data
 * Falls back to 'User' if no name is available
 */
export function getDisplayName(profileName?: string | null): string {
  if (!profileName || profileName.trim() === '') {
    return 'User';
  }
  return profileName.trim();
}
