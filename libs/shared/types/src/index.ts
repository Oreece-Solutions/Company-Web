// Export all shared types
// Add any shared TypeScript interfaces or types here
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  project?: string;
  message: string;
  budget?: string;
}
