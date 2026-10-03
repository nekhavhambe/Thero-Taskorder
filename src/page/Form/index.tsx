import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Star } from 'lucide-react';
import { Field } from '../../components/Field';
import { TextInput } from '../../components/TextInput';
import { Autocomplete } from '../../components/Autocomplete';
import { Select } from '../../components/Select';
import { DatePicker } from '../../components/DatePicker';
import { Checkbox } from '../../components/Checkbox';
import { TOOLBAR_ACTION_EVENT } from '../../components/Toolbar';
import type { ToolbarActionDetail } from '../../components/Toolbar';
import {
  AGREEMENT_OPTIONS,
  CURRENCY_OPTIONS,
  DELIVER_TO_OPTIONS,
  INITIAL_RFQ_DATA,
  PAYMENT_TERMS_OPTIONS,
} from '../../components/data';
import type { RFQFormData, Vendor } from '../../components/types';
import { createVendor, vendorCollection } from '../../collections/vendors';

export interface FormProps {
  initialData?: RFQFormData;
  onSave?: (data: RFQFormData) => void;
}

export const Form: FC<FormProps> = ({
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

  const handleUpdate = <K extends keyof RFQFormData>(field: K, value: RFQFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateVendor = (name: string): Vendor => {
    return createVendor(name);
  };



  return (
      <div className="p-6 sm:p-8 space-y-6">
        {/* Title row */}
        <div>
          <div className="text-xs sm:text-sm font-medium text-slate-700 tracking-tight mb-1">
            Request for Quotation
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleUpdate('isFavorite', !formData.isFavorite)}
              aria-label="Bookmark this RFQ"
              className="p-1 -ml-1 text-slate-400 hover:text-amber-500 focus:outline-none"
            >
              <Star
                className={`w-7 h-7 sm:w-8 sm:h-8 ${
                  formData.isFavorite
                    ? 'fill-amber-400 text-amber-500'
                    : 'text-slate-300 stroke-[1.5]'
                }`}
              />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              {formData.docTitle}
            </h1>
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2 pt-2">
          {/* Left Column */}
          <div className="space-y-1">
            <Field
              label="Vendor"
              tooltip="Select a vendor or create one by typing. Shows id--name."
              htmlFor="vendor-input"
            >
              <Autocomplete<Vendor>
                id="vendor-input"
                name="vendor"
                collection={vendorCollection}
                displayFields={['id', 'name']}
                getKey={(vendor) => vendor.id}
                value={formData.vendor?.id ?? null}
                onChange={(_key, vendor) => handleUpdate('vendor', vendor)}
                onCreate={handleCreateVendor}
                placeholder="1000--Deco Addict"
              />
            </Field>

            <Field
              label="Vendor Reference"
              tooltip="Reference of the sales order or bid sent by the vendor. It's used when you receive the products or invoice to cross-reference."
              htmlFor="vendor-reference-input"
            >
              <TextInput
                id="vendor-reference-input"
                value={formData.vendorReference}
                onChange={(e) => handleUpdate('vendorReference', e.target.value)}
                variant="underline"
                clearable
                onClear={() => handleUpdate('vendorReference', '')}
              />
            </Field>

            <Field label="Agreement" htmlFor="agreement-select">
              <Select
                id="agreement-select"
                value={formData.agreement}
                onChange={(val) => handleUpdate('agreement', val)}
                options={AGREEMENT_OPTIONS}
              />
            </Field>

            <Field label="Currency" htmlFor="currency-select">
              <Select
                id="currency-select"
                value={formData.currency}
                onChange={(val) => handleUpdate('currency', val)}
                options={CURRENCY_OPTIONS}
                placeholder="USD"
              />
            </Field>

            <Field label="Payment Terms" htmlFor="payment-terms-select">
              <Select
                id="payment-terms-select"
                value={formData.paymentTerms}
                onChange={(val) => handleUpdate('paymentTerms', val)}
                options={PAYMENT_TERMS_OPTIONS}
              />
            </Field>
          </div>

          {/* Right Column */}
          <div className="space-y-1">
            <Field
              label="Order Deadline"
              tooltip="Depicts the date within which the quotation should be confirmed and converted into a purchase order."
              htmlFor="order-deadline-picker"
            >
              <DatePicker
                id="order-deadline-picker"
                value={formData.orderDeadline}
                onChange={(val) => handleUpdate('orderDeadline', val)}
                placeholder="Select date"
              />
            </Field>

            <Field
              label="Expected Arrival"
              tooltip="Delivery date promised by vendor. When empty, defaults to order deadline plus vendor lead time."
              htmlFor="expected-arrival-picker"
            >
              <DatePicker
                id="expected-arrival-picker"
                value={formData.expectedArrival}
                onChange={(val) => handleUpdate('expectedArrival', val)}
                placeholder=""
              />
            </Field>

            <Field
              label="Arrival Confirmation"
              htmlFor="arrival-confirmation-checkbox"
            >
              <div className="pt-1">
                <Checkbox
                  id="arrival-confirmation-checkbox"
                  checked={formData.arrivalConfirmation}
                  onChange={(checked) => handleUpdate('arrivalConfirmation', checked)}
                />
              </div>
            </Field>

            <Field
              label="Deliver To"
              tooltip="This will determine operation type of incoming shipment (e.g. internal warehouse receipt or direct dropship)."
              htmlFor="deliver-to-select"
            >
              <Select
                id="deliver-to-select"
                value={formData.deliverTo}
                onChange={(val) => handleUpdate('deliverTo', val)}
                options={DELIVER_TO_OPTIONS}
                placeholder="YourCompany: Receipts"
              />
            </Field>
          </div>
        </div>
      </div>
  );
};

export default Form;
