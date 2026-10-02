import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import type { Vendor } from '../components/types';

export const VENDOR_STORAGE_KEY = 'thero-vendors';

/** Initial mockup data — seeded into localStorage on first run only. */
export const VENDOR_SEED: Vendor[] = [
  {
    id: '1000',
    name: 'Deco Addict',
    tin: 'US-89472019',
    email: 'orders@decoaddict.com',
    reference: 'DA-SUP-2026',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: '1001',
    name: 'Azure Interior Systems',
    tin: 'US-93820174',
    email: 'procurement@azureinterior.io',
    reference: 'AZR-992',
    avatarColor: 'bg-blue-600',
  },
  {
    id: '1002',
    name: 'Gemini Industrial Supplies',
    tin: 'US-10293847',
    email: 'contact@gemini-industrial.com',
    reference: 'GIS-B2B-44',
    avatarColor: 'bg-amber-600',
  },
  {
    id: '1003',
    name: 'Lumber & Timber Global',
    tin: 'US-73910284',
    email: 'sales@lumbertimber.org',
    reference: 'LTG-7710',
    avatarColor: 'bg-teal-600',
  },
];

/**
 * Vendor collection persisted to localStorage.
 * Swap this import for a Query/Electric collection later — components only
 * depend on the Collection interface, not the storage backend.
 */
export const vendorCollection = createCollection(
  localStorageCollectionOptions<Vendor>({
    id: 'vendors',
    storageKey: VENDOR_STORAGE_KEY,
    getKey: (item) => item.id,
  })
);

let seedPromise: Promise<void> | null = null;

/** Inserts mockup data only when the collection is empty (first run). */
export function seedVendorsIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await vendorCollection.preload();
      if (vendorCollection.size === 0) {
        for (const vendor of VENDOR_SEED) {
          vendorCollection.insert(vendor);
        }
      }
    })();
  }
  return seedPromise;
}

// Seed once at startup; live queries pick the rows up reactively.
void seedVendorsIfEmpty();

/** Creates a vendor row in the collection and returns it. */
export function createVendor(name: string): Vendor {
  const vendor: Vendor = {
    id: `v-${Date.now()}`,
    name,
    tin: `US-${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    reference: `REF-${Math.floor(100 + Math.random() * 900)}`,
    avatarColor: 'bg-teal-600',
  };
  vendorCollection.insert(vendor);
  return vendor;
}
