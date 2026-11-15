// ========================================
// FILE: src/locales/en/common.ts (ou adicionar ao existente)

import { view } from "drizzle-orm/sqlite-core";

// ========================================
export const enCommon = {
    preview: "Preview",
    tip: "Tip",
    optional: "optional",
    loading: "Loading...",
    characters: "characters",
    export: "Export",
    today: "Today",
    info: "Information",
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    search: 'Search',
    filter: 'Filter',
    pagination: {
        showing: "Showing {{start}} to {{end}} of {{total}} records",
        itemsPerPage: "Items per page",
        page: "Page",
        of: "of",
        first: "First",
        previous: "Previous",
        next: "Next",
        last: "Last",
        noRecords: "No records",
        range: "{{from}} – {{to}} of {{total}}",
        perPage: "per page",
        firstPage: "First page",
        prevPage: "Previous page",
        nextPage: "Next page",
        lastPage: "Last page",
    },

    colors: {
        blue: "Blue",
        green: "Green",
        amber: "Amber",
        red: "Red",
        purple: "Purple",
        pink: "Pink",
        cyan: "Cyan",
        orange: "Orange",
  },
    status: {
      active: "Active",
      inactive: "Inactive",
      none: "None",
      inProgress: 'In Progress',
      completed: 'Completed',
      scheduled: 'Scheduled',
      pending: 'Pending',
      paid: 'Paid',
      cancelled: 'Cancelled',
      available: 'Available',
      unavailable: 'Unavailable',
    },
    confirmDelete: {
        title: "Are you sure?",
        default: "This action cannot be undone. This record will be marked as deleted.",
        defaultWithItem: 'This action cannot be undone. The record "{{itemName}}" will be marked as deleted.'
    },
  noData: 'No data',
  actions: {
        actions: "Actions",
        close: "Close",
        cancel: "Cancel",
        delete: "Delete",
        deleting: "Deleting...",
        edit: "Edit",
        view: "View details",
        editing: "Editing...",
        selected: "Selected",
        clickToSelect: "Click to select",
        yes: "Yes",
        no: "No",
        saving: 'Saving ...',
        save: 'Save',
        dismiss: 'Dismiss',
        clearFilters: 'Clear filters',
    },
    warnigns: {
        categoryRequired: "Please select a category",
        licensePlateRequired: "Please enter a vehicle license plate",
    },
    errors: {
        noPermission: "You do not have permission for this action. Contact your organization administrator.",
        errorLoading: "Error loading",
        errorLoadingCategories: "Error loading categories",
        notFound:{
            vehicle: "Vehicle not found",
            vehicleCategory: "Vehicle category not found",
            expenseCategory: "Expense category not found",
        }
    },

  viewModes: {
  compact: 'Compact',
  normal: 'List', 
  cards: 'Cards'
}
} as const;