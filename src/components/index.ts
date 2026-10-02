// Clean names (no ERP prefix) — preferred imports
export { FieldLabel } from './FieldLabel';
export type { FieldLabelProps } from './FieldLabel';
export { Field } from './Field';
export type { FieldProps } from './Field';
export { Layout } from './Layout';
export { Toolbar, ToolbarButton, StatusPill } from './Toolbar';
export type { ToolbarProps, ToolbarButtonProps, StatusPillProps } from './Toolbar';
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';
export { NumericInput } from './NumericInput';
export type { NumericInputProps } from './NumericInput';
export { Select } from './Select';
export type { SelectProps } from './Select';
export { Autocomplete } from './Autocomplete';
export type { AutocompleteProps } from './Autocomplete';
export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';
export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';
export { TaskOrderHeader } from '../page/new';
export type { TaskOrderHeaderData, TaskOrderHeaderProps } from '../page/new';

export type { Vendor, SelectOption, RFQFormData } from './types';
export {
  AGREEMENT_OPTIONS,
  CURRENCY_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  DELIVER_TO_OPTIONS,
  INITIAL_RFQ_DATA,
} from './data';

// Backwards-compatible ERP* aliases (old src/componets/index.tsx names)
export { FieldLabel as FieldLabelWithTooltip } from './FieldLabel';
export type { FieldLabelProps as FieldLabelWithTooltipProps } from './FieldLabel';
export { FieldLabel as ERPFieldLabel } from './FieldLabel';
export { Field as ERPField, Field as ERPFormRow } from './Field';
export type { FieldProps as ERPFormRowProps } from './Field';
export { TextInput as ERPTextInput } from './TextInput';
export type { TextInputProps as ERPTextInputProps } from './TextInput';
export { Select as ERPSelect } from './Select';
export type { SelectProps as ERPSelectProps } from './Select';
export { Autocomplete as ERPAutocomplete } from './Autocomplete';
export type { AutocompleteProps as ERPAutocompleteProps } from './Autocomplete';
export { DatePicker as ERPDatePicker } from './DatePicker';
export type { DatePickerProps as ERPDatePickerProps } from './DatePicker';
export { Checkbox as ERPCheckbox } from './Checkbox';
export type { CheckboxProps as ERPCheckboxProps } from './Checkbox';
