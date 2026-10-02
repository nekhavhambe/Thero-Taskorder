import type { RFQFormData, SelectOption } from './types';

export const AGREEMENT_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'PA0001', label: 'PA0001 - Blanket Purchase Agreement (Lumber & Metals)', description: 'Valid through Dec 2026' },
  { value: 'PA0002', label: 'PA0002 - Framework Contract Q4', description: 'Volume discount tier 2 applied' },
];

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'USD', label: 'USD', description: 'United States Dollar' },
  { value: 'EUR', label: 'EUR', description: 'Euro' },
  { value: 'GBP', label: 'GBP', description: 'British Pound' },
  { value: 'CAD', label: 'CAD', description: 'Canadian Dollar' },
  { value: 'JPY', label: 'JPY', description: 'Japanese Yen' },
];

export const PAYMENT_TERMS_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'Select Payment Terms' },
  { value: 'immediate', label: 'Immediate Payment' },
  { value: '15days', label: '15 Days' },
  { value: '30days', label: '30 Days' },
  { value: 'end_following_month', label: 'End of Following Month' },
];

export const DELIVER_TO_OPTIONS: SelectOption[] = [
  { value: 'YourCompany: Receipts', label: 'YourCompany: Receipts', description: 'Main internal receiving dock' },
  { value: 'YourCompany: Dropship', label: 'YourCompany: Dropship', description: 'Direct ship to customer destination' },
  { value: 'San Francisco: Stock', label: 'San Francisco: Stock', description: 'West coast distribution center' },
];

export const INITIAL_RFQ_DATA: RFQFormData = {
  isFavorite: false,
  docTitle: 'New',
  vendor: null,
  vendorReference: '',
  agreement: 'none',
  currency: 'USD',
  paymentTerms: 'none',
  orderDeadline: '2026-10-02',
  expectedArrival: '',
  arrivalConfirmation: false,
  deliverTo: 'YourCompany: Receipts',
};
