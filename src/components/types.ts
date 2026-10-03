export interface Vendor {
  id: string;
  name: string;
  tin?: string;
  email?: string;
  reference?: string;
  avatarColor?: string;
}

export interface Project {
  id: string;
  name: string;
  reference?: string;
  currency?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface RFQFormData {
  isFavorite: boolean;
  docTitle: string;
  vendor: Vendor | null;
  vendorReference: string;
  agreement: string;
  currency: string;
  paymentTerms: string;
  orderDeadline: string; // 'YYYY-MM-DD'
  expectedArrival: string; // 'YYYY-MM-DD'
  arrivalConfirmation: boolean;
  deliverTo: string;
}
