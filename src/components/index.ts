// Clean names (no ERP prefix) — preferred imports
export { Label, FieldLabel } from './forms/label';
export type { LabelProps, FieldLabelProps } from './forms/label';
export { Field } from './forms/field';
export type { FieldProps } from './forms/field';
export { Layout } from './layouts/layout';
export { Toolbar, ToolbarButton, StatusPill, StatusChip } from './layouts/toolbar';
export type { ToolbarProps, ToolbarButtonProps, StatusPillProps, StatusChipProps } from './layouts/toolbar';
export { TextInput } from './inputs/textinput';
export type { TextInputProps } from './inputs/textinput';
export { NumericInput } from './inputs/numericinput';
export type { NumericInputProps } from './inputs/numericinput';
export { Select } from './inputs/select';
export type { SelectProps } from './inputs/select';
export { Autocomplete } from './inputs/autocomplete';
export type { AutocompleteProps } from './inputs/autocomplete';
export { DatePicker } from './inputs/datepicker';
export type { DatePickerProps } from './inputs/datepicker';
export { Checkbox } from './inputs/checkbox';
export type { CheckboxProps } from './inputs/checkbox';
export { TaskOrders, TaskOrders as TaskOrderHeader } from '../page/task-orders';
export type { TaskOrderConfig } from '../page/task-orders';

export type { Vendor } from '../collections/vendors';
export type { SelectOption } from './inputs/select';
export type { RFQFormData } from '../page/sales-order';

// Backwards-compatible ERP* aliases (old src/componets/index.tsx names)
export { Label as FieldLabelWithTooltip } from './forms/label';
export type { LabelProps as FieldLabelWithTooltipProps } from './forms/label';
export { Label as ERPFieldLabel } from './forms/label';
export { Field as ERPField, Field as ERPFormRow } from './forms/field';
export type { FieldProps as ERPFormRowProps } from './forms/field';
export { TextInput as ERPTextInput } from './inputs/textinput';
export type { TextInputProps as ERPTextInputProps } from './inputs/textinput';
export { Select as ERPSelect } from './inputs/select';
export type { SelectProps as ERPSelectProps } from './inputs/select';
export { Autocomplete as ERPAutocomplete } from './inputs/autocomplete';
export type { AutocompleteProps as ERPAutocompleteProps } from './inputs/autocomplete';
export { DatePicker as ERPDatePicker } from './inputs/datepicker';
export type { DatePickerProps as ERPDatePickerProps } from './inputs/datepicker';
export { Checkbox as ERPCheckbox } from './inputs/checkbox';
export type { CheckboxProps as ERPCheckboxProps } from './inputs/checkbox';
