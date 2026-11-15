// ========================================
// FILE: src/locales/en/maintenances.ts (ATUALIZADO)
// ========================================
export const enMaintenances = {
  title: 'Maintenance Management',
  description: 'Manage fleet maintenance',
  newMaintenance: 'New Maintenance',
  noMaintenances: 'No maintenance records found',
  searchPlaceholder: 'Search by vehicle or category...',

  tabs: {
    maintenances: 'Maintenances',
    categories: 'Categories',
    workshops: 'Workshops',
  },

  stats: {
    total: 'Total',
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    totalCost: 'Total Cost',
    averageCost: 'Average Cost',
  },

  status: {
    scheduled: {
      label: 'Scheduled',
      description: 'Scheduled maintenance',
    },
    in_progress: {
      label: 'In Progress',
      description: 'Ongoing maintenance',
    },
    completed: {
      label: 'Completed',
      description: 'Completed maintenance',
    },
    cancelled: {
      label: 'Cancelled',
      description: 'Cancelled maintenance',
    },
  },

  priority: {
    low: {
      label: 'Low',
      description: 'Low priority',
    },
    normal: {
      label: 'Normal',
      description: 'Normal priority',
    },
    high: {
      label: 'High',
      description: 'High priority',
    },
    urgent: {
      label: 'Urgent',
      description: 'Urgent priority',
    },
  },

  type: {
    preventive: {
      label: 'Preventive',
      short: 'Prev.',
      description: 'Preventive maintenance',
    },
    corrective: {
      label: 'Corrective',
      short: 'Corr.',
      description: 'Corrective maintenance',
    },
  },

  fields: {
    vehicle: 'Vehicle',
    category: 'Category',
    workshop: 'Workshop',
    type: 'Type',
    entryDate: 'Entry Date',
    exitDate: 'Exit Date',
    mileage: 'Mileage',
    description: 'Description',
    diagnosis: 'Diagnosis',
    solution: 'Solution',
    partsCost: 'Parts Cost',
    laborCost: 'Labor Cost',
    totalCost: 'Total Cost',
    status: 'Status',
    priority: 'Priority',
    workOrderNumber: 'Work Order Number',
    notes: 'Notes',
    nextMaintenanceKm: 'Next Maintenance (km)',
    categoryName: 'Category Name',
    categoryDescription: 'Category Description',
    categoryType: 'Category Type',
    categoryColor: 'Color',
  },

  placeholders: {
    vehicle: 'Select vehicle',
    category: 'Select category',
    workshop: 'Select workshop (optional)',
    type: 'Select type',
    mileage: 'E.g.: 45000',
    description: 'Describe the problem or service to be performed...',
    diagnosis: 'Describe initial diagnosis...',
    solution: 'Describe work performed and solutions applied...',
    partsCost: '0.00',
    laborCost: '0.00',
    workOrderNumber: 'E.g.: WO-2025-001',
    notes: 'Additional information...',
    categoryName: 'E.g.: Oil Change, Brake Inspection',
    categoryDescription: 'Optional category description...',
    categoryNamePreview: 'Category name',
    // NOVOS PLACEHOLDERS PARA EDIT
    selectVehicle: 'Select vehicle',
    searchVehicle: 'Search by license plate, brand...',
    selectCategory: 'Select category',
    searchCategory: 'Search by name...',
    selectWorkshop: 'Select workshop',
    searchWorkshop: 'Search by name or city...',
    selectStatus: 'Select status',
    selectPriority: 'Select priority',
    addNotes: 'Add notes here',
    nextMaintenanceKm: 'E.g.: 85000',
  },

  actions: {
    view: 'View Details',
    start: 'Start',
    complete: 'Complete',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    create: 'Create',
    update: 'Update',
    creating: 'Creating...',
    updating: 'Updating...',
    starting: 'Starting...',
    completing: 'Completing...',
    deleting: 'Deleting...',
    schedule: 'Schedule Maintenance',
    startNow: 'Start Maintenance',
    startNowDescription: 'Start maintenance immediately (change vehicle status to Under Maintenance)',
    activate: 'Activate',
    activating: 'Activating...',
  },

  dialogs: {
    new: {
      title: 'Register Maintenance',
      description: 'Fill in the maintenance details',
    },
    edit: {  // NOVO
      title: 'Edit Maintenance',
      description: 'Update the selected maintenance details',
    },
    start: {
      title: 'Start Maintenance',
      description: 'Start the maintenance',
    },
    complete: {
      title: 'Complete Maintenance',
      description: 'Finalize the maintenance',
    },
    view: {
      title: 'Maintenance Details',
      description: 'Complete information about the maintenance',
      dates: 'Dates',
      costs: 'Costs',
      additionalInfo: 'Additional Information',
      descriptions: 'Descriptions',
    },
    delete: {
      title: 'Delete Maintenance',
      description: 'Are you sure you want to delete the maintenance',
      warning: 'This action cannot be undone.',
    },
    newCategory: {
      title: 'New Maintenance Category',
      description: 'Create a category to organize maintenance',
    },
    deleteCategory: {
      title: 'Delete Category',
      description: 'Are you sure you want to delete the category',
      warning: 'This action cannot be undone.',
    },
    editCategory: {
      title: 'Edit Category',
      description: 'Edit the selected category details.',
    },
  },

  alerts: {
    noVehicles: 'No vehicles available',
    noCategories: 'No categories available',
    noWorkshops: 'No workshops available',
    diagnosisRequired: 'Please add an initial diagnosis',
    solutionRequired: 'Please describe the solution applied',
    vehicleInMaintenance: 'Maintenance in progress',
    upcomingOne: '1 vehicle is approaching its next scheduled maintenance',
    upcomingMany: '{{count}} vehicles are approaching their next scheduled maintenance',
    overdue: 'Maintenance overdue',
    remainingKm: '{{km}} km remaining',
    nextAt: 'next at',
  },

  toast: {
    createSuccess: 'Maintenance registered successfully',
    createError: 'Error registering maintenance',
    updateSuccess: 'Maintenance updated successfully',
    updateError: 'Error updating maintenance',
    startSuccess: 'Maintenance started successfully',
    startError: 'Error starting maintenance',
    completeSuccess: 'Maintenance completed successfully',
    completeError: 'Error completing maintenance',
    deleteSuccess: 'Maintenance deleted successfully',
    deleteError: 'Error deleting maintenance',
    categoryCreateSuccess: 'Category created successfully',
    categoryCreateError: 'Error creating category',
    categoryUpdateSuccess: 'Category updated successfully',
    categoryUpdateError: 'Error updating category',
    categoryDeleteSuccess: 'Category deleted successfully',
    categoryDeleteError: 'Error deleting category',
    categoryRestored: 'Category activated successfully',
  },

  errors: {
    vehicleOnTrip: 'The vehicle is on a trip in progress — finish the trip before starting the maintenance',
    maintenanceNotActive: 'Only a scheduled or in-progress maintenance can be completed',
    errorLoading: 'Error loading maintenances',
    errorLoadingCategories: 'Error loading categories',
    maintenanceNotFound: 'Maintenance not found',
    categoryNotFound: 'Category not found',
    categoryAlreadyExists: "Category with name '{{name}}' already exists",
    categoryHasMaintenances: 'This category has {{count}} linked maintenance{{s}}',
    vehicleNotAvailable: 'Vehicle is not available',
    restoreFailed: 'Error activating category',
    requiredField: 'Required field: {{field}}',
  },

  warnings: {
    categoryExistsInactive: "Category '{{name}}' exists but is inactive.",
  },

  validation: {
    vehicleRequired: 'Vehicle is required',
    categoryRequired: 'Category is required',
    typeRequired: 'Type is required',
    descriptionRequired: 'Description is required',
    mileageRequired: 'Mileage is required',
    mileagePositive: 'Mileage must be greater than zero',
    categoryNameRequired: 'Category name is required',
  },

  info: {
    enteredOn: 'Entered on',
    exitedOn: 'Exited on',
    currentlyInProgress: 'Currently in progress',
    noWorkshop: 'No workshop',
    noObservations: 'No observations recorded',
    noNotes: 'No notes',
    estimatedCost: 'Estimated Cost',
    finalCost: 'Final Cost',
    inProgressCount: '{{count}} in progress',
    scheduledCount: '{{count}} scheduled',
    preventiveCount: '{{count}} preventive',
    correctiveCount: '{{count}} corrective',
    auto: 'Auto',
    typeAutoFilled: 'Type defined by selected category',
    mileageAutoFilled: 'Mileage filled automatically ({{mileage}} km)',
    nextMaintenanceKmHint: 'Optional. The system alerts you when the vehicle approaches this mileage.',
  },

  filters: {
    all: 'All statuses',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    allTypes: 'All types',
    allCategories: 'All categories',
  },

  viewModes: {
    compact: 'Compact',
    normal: 'Normal',
    cards: 'Cards',
  },

  categories: {
    title: 'Maintenance Categories',
    newCategory: 'New Category',
    preventive: 'Preventive',
    corrective: 'Corrective',
    active: 'Active',
    inactive: 'Inactive',
    noDescription: 'No description',
    colors: {
      red: 'Red',
      orange: 'Orange',
      green: 'Green',
      blue: 'Blue',
      purple: 'Purple',
      pink: 'Pink',
      gray: 'Gray',
    },
  },

  // NOVAS SEÇÕES PARA O DIÁLOGO DE EDIÇÃO
  sections: {
    identification: 'Identification',
    workshop: 'Workshop & Status',
    schedule: 'Scheduling',
    costs: 'Costs',
    details: 'Details',
  },

  workshops: {
    title: 'Workshops',
    newWorkshop: 'New Workshop',
    noWorkshops: 'No workshops registered',

    fields: {
      name: 'Workshop Name',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      city: 'City',
      state: 'State/Province',
      specialties: 'Specialties',
      notes: 'Notes',
    },

    placeholders: {
      name: 'E.g.: Central Workshop',
      phone: 'E.g.: 923 456 789',
      email: 'E.g.: workshop@example.com',
      address: 'E.g.: Mission Street, 123',
      city: 'E.g.: Luanda',
      state: 'E.g.: Luanda',
      specialties: 'E.g.: General mechanics, Electrical, Body work',
      notes: 'Additional information about the workshop...',
    },

    dialogs: {
      new: {
        title: 'Register Workshop',
        description: 'Fill in the workshop details',
      },
      edit: {
        title: 'Edit Workshop',
        description: 'Update the workshop details',
      },
      delete: {
        title: 'Delete Workshop',
        description: 'Are you sure you want to delete the workshop',
        warning: 'This action cannot be undone.',
      },
    },

    toast: {
      createSuccess: 'Workshop registered successfully',
      createError: 'Error registering workshop',
      updateSuccess: 'Workshop updated successfully',
      updateError: 'Error updating workshop',
      deleteSuccess: 'Workshop deleted successfully',
      deleteError: 'Error deleting workshop',
      restored: 'Workshop activated successfully',
    },

    errors: {
      workshopNotFound: 'Workshop not found',
      workshopAlreadyExists: "Workshop with name '{{name}}' already exists",
      workshopHasMaintenances: 'This workshop has {{count}} linked maintenance{{s}}',
      restoreFailed: 'Error activating workshop',
    },

    warnings: {
      workshopExistsInactive: "Workshop '{{name}}' exists but is inactive.",
    },

    validation: {
      nameRequired: 'Workshop name is required',
    },

    stats: {
      total: 'Total',
      active: 'Active',
      inactive: 'Inactive',
    },

    info: {
      noDescription: 'No description',
      noSpecialties: 'No specialties defined',
      activeCount: '{{count}} active workshop{{plural}}',
    },
  },

  analytics: {
    total:             'Total',
    scheduled:         'Scheduled',
    inProgress:        'In Progress',
    totalCost:         'Total Cost',
    statusScheduled:   'Scheduled',
    statusInProgress:  'In Progress',
    statusCompleted:   'Completed',
    statusCancelled:   'Cancelled',
    maintenanceStatus: 'Maintenance Status',
    costByVehicle:     'Cost by Vehicle',
    cost:              'Cost',
  },
} as const;

export default enMaintenances;