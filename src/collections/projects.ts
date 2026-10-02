import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';
import type { Project } from '../components/types';

export const PROJECT_STORAGE_KEY = 'thero-projects';

/** Initial mockup data — seeded into localStorage on first run only. */
export const PROJECT_SEED: Project[] = [
  {
    id: 'TS-23-000033',
    name: 'PLA| Aries-Upington 400kV Overhead Line',
    reference: 'Aries-Upington',
  },
  {
    id: 'TS-23-000032',
    name: 'ESKOM | Entokozweni - Tekwane North 132kV',
    reference: 'Entokozweni',
  },
  {
    id: 'TS-23-000031',
    name: 'ESKOM | Uchoba Der Brochen 132kV Power Line',
    reference: 'Uchoba',
  },
  {
    id: 'NON001',
    name: 'NON-BILLABLE',
    reference: 'Internal',
  },
];

/**
 * Project collection persisted to localStorage.
 * Swap this import for a Query/Electric collection later — components only
 * depend on the Collection interface, not the storage backend.
 */
export const projectCollection = createCollection(
  localStorageCollectionOptions<Project>({
    id: 'projects',
    storageKey: PROJECT_STORAGE_KEY,
    getKey: (item) => item.id,
  })
);

let seedPromise: Promise<void> | null = null;

/** Inserts mockup data only when the collection is empty (first run). */
export function seedProjectsIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await projectCollection.preload();
      if (projectCollection.size === 0) {
        for (const project of PROJECT_SEED) {
          projectCollection.insert(project);
        }
      }
    })();
  }
  return seedPromise;
}

// Seed once at startup; live queries pick the rows up reactively.
void seedProjectsIfEmpty();

/** Creates a project row in the collection and returns it. */
export function createProject(name: string): Project {
  const project: Project = {
    id: `P-${Date.now()}`,
    name,
  };
  projectCollection.insert(project);
  return project;
}
