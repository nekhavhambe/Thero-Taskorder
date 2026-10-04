import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Field } from '../../components/forms/field';
import { TOOLBAR_ACTION_EVENT } from '../../components/layouts/toolbar';
import type { ToolbarActionDetail } from '../../components/layouts/toolbar';
import type { Vendor } from '../../collections/vendors';

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
  /** Read-only summary fields. */
  salesOrderNumber: string;
  poNumber: string;
  billedAmount: string;
  unbilledAmount: string;
}

export const INITIAL_SALES_ORDER_DATA: RFQFormData = {
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
  salesOrderNumber: '',
  poNumber: '',
  billedAmount: '',
  unbilledAmount: '',
};

/** Backwards-compatible alias. */
export const INITIAL_RFQ_DATA = INITIAL_SALES_ORDER_DATA;

export interface SalesOrderProps {
  initialData?: RFQFormData;
  onSave?: (data: RFQFormData) => void;
}

/** Backwards-compatible alias. */
export type FormProps = SalesOrderProps;

const ReadOnlyValue: FC<{ value: string }> = ({ value }) => (
  <div className="text-sm font-medium text-slate-900 py-1.5 px-0.5 truncate">
    {value !== '' ? value : <span className="text-slate-400 font-normal">—</span>}
  </div>
);

export const SalesOrder: FC<SalesOrderProps> = ({
  initialData = INITIAL_RFQ_DATA,
  onSave,
}) => {
  const [formData, setFormData] = useState<RFQFormData>(initialData);

  // "New" resets the form; Generate / Issue bubble up via onSave.
  useEffect(() => {
    const handler = (e: Event) => {
      const { action, waitUntil } = (e as CustomEvent<ToolbarActionDetail>).detail;
      if (action === 'new') {
        setFormData(INITIAL_RFQ_DATA);
      } else if (action === 'generate' || action === 'issue') {
        if (onSave) waitUntil(Promise.resolve().then(() => onSave(formData)));
      }
    };
    window.addEventListener(TOOLBAR_ACTION_EVENT, handler);
    return () => window.removeEventListener(TOOLBAR_ACTION_EVENT, handler);
  }, [formData, onSave]);

  return (
      <div className="px-6 sm:px-8 py-2 space-y-2">
        {/* 2-Column Responsive Grid — read-only summary fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 pt-2">
          {/* Left Column */}
          <div className="space-y-1">
            <Field label="Sales Order Number" htmlFor="sales-order-number">
              <ReadOnlyValue value={formData.salesOrderNumber} />
            </Field>

            <Field label="PO Number" htmlFor="po-number">
              <ReadOnlyValue value={formData.poNumber} />
            </Field>
          </div>

          {/* Right Column */}
          <div className="space-y-1">
            <Field label="Billed Amount" htmlFor="billed-amount">
              <ReadOnlyValue value={formData.billedAmount} />
            </Field>

            <Field label="UnBilled Amount" htmlFor="unbilled-amount">
              <ReadOnlyValue value={formData.unbilledAmount} />
            </Field>
          </div>
        </div>
      </div>
  );
};

/** Backwards-compatible alias. */
export const Form = SalesOrder;

export default SalesOrder;
