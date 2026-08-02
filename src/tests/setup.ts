import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the Blob URL APIs; backup/CSV export code calls them
// to trigger downloads, so stub them out for tests that exercise those paths.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}

