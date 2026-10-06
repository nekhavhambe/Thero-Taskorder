import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { StaticDataTable } from '../../components/tables/entry-table';
import type { EntryColumn } from '../../components/tables/entry-table';
import { formatCurrency } from '../../components/tables/entry-table';
import {
  purchaseRequisitionDocumentsCollection,
  refreshPurchaseRequisitionDocuments,
} from '../../collections/purchase-requisition-documents';
import { useCollectionItems } from '../../collections/helpers';
import type { PurchaseDocument } from '../../collections/purchase-document';

const formatDate = (value: string | undefined): string => {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  const parsed = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const amount = (value: string | number | undefined): number =>
  typeof value === 'number' ? value : parseFloat(value ?? '') || 0;

const requisitionColumns: EntryColumn<PurchaseDocument>[] = [
  {
    key: 'date',
    header: 'Date',
    width: 130,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 whitespace-nowrap">
        {formatDate(row.WHENCREATED ?? row.WHENDUE)}
      </div>
    ),
  },
  {
    key: 'document',
    header: 'Document',
    width: 180,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs font-medium text-slate-900 truncate">
        {(row.DOCNO ?? '').trim() || (row.DOCID ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'supplier',
    header: 'Supplier',
    width: 220,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 truncate">
        {(row.CUSTVENDNAME ?? '').trim() || (row.CUSTVENDID ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 130,
    align: 'left',
    display: (row) => (
      <div className="py-1.5 px-2 text-xs text-slate-800 whitespace-nowrap">
        {(row.STATE ?? '').trim() || '—'}
      </div>
    ),
  },
  {
    key: 'value',
    header: 'Value',
    width: 140,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800">
        {formatCurrency(amount(row.TRX_TOTAL ?? row.TOTAL))}
      </div>
    ),
  },
  {
    key: 'remaining',
    header: 'Remaining Balance',
    width: 160,
    align: 'right',
    display: (row) => (
      <div className="py-1.5 px-2 text-right tabular-nums text-xs text-slate-800">
        {formatCurrency(amount(row.TRX_TOTALDUE ?? row.TOTALDUE))}
      </div>
    ),
  },
  {
    key: 'convert',
    header: 'Convert to PO',
    width: 140,
    align: 'center',
    display: (row) => (
      <div className="py-1 px-2 text-center">
        <button
          type="button"
          title={`Convert ${(row.DOCNO ?? '').trim() || 'requisition'} to purchase order`}
          onClick={() =>
            console.info('Convert to PO requested:', (row.DOCNO ?? '').trim() || row.RECORDNO)
          }
          className="px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors cursor-pointer whitespace-nowrap"
        >
          Convert to PO
        </button>
      </div>
    ),
  },
];

/** Requisitions tab — purchase requisition documents with Convert to PO. */
export const Requisitions: FC = () => {
  const rows = useCollectionItems<PurchaseDocument>(purchaseRequisitionDocumentsCollection);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void refreshPurchaseRequisitionDocuments().catch((err) =>
      console.warn('Requisition documents refresh skipped:', (err as Error).message),
    );
  }, []);

  return (
    <div className="-mx-6 -mb-6 -mt-6 overflow-hidden rounded [&>div]:border-x-0 [&>div]:border-b-0 [&>div]:border-t-0">
      <StaticDataTable<PurchaseDocument>
        data={rows}
        onChange={() => {}}
        columns={requisitionColumns}
        getRowId={(row) => String(row.RECORDNO ?? '')}
        createRow={() => ({}) as PurchaseDocument}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        reorderable={false}
        removable={false}
        showRowNumbers={false}
        emptyText="No requisitions yet."
      />
    </div>
  );
};

export default Requisitions;
