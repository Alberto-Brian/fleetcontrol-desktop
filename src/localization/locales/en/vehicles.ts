// ========================================
// FILE: src/locales/en/vehicles.ts
// ========================================
export const enVehicles = {
  title: "Vehicle Fleet",
  description: "Manage and monitor the status of all organization vehicles.",
  
  stats: {
    total: "Total",
    available: "Available",
    inUse: "In Use",
    inMaintenance: "In Maintenance",
    maintenance: "Maintenance",
    inactive: "Inactive"
  },

  status: {
    available: {
      label: "Available",
      description: "Vehicle ready for use"
    },
    in_use: {
      label: "In use",
      description: "Vehicle assigned to an activity"
    },
    maintenance: {
      label: "Maintenance",
      description: "Vehicle under repair or maintenance"
    },
    inactive: {
      label: "Inactive",
      description: "Vehicle temporarily out of operation"
    }
  },

  statusChange: {
    title: 'Change Vehicle Status',
    currentStatus: 'Current Status',
    newStatus: 'New Status',
    notesLabel: 'Reason / Notes',
    notesPlaceholder: 'e.g., Vehicle sent for 50,000 km service. Expected return: 03/15/2024',
    notesHelper: 'This note will be automatically added to the vehicle history with date and time',
    notePrefix: 'Status changed to',
    infoTitle: 'Status Change',
    infoDescription: 'The complete history of changes will be recorded in the system for future audit.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    updating: 'Updating...',
  },

  fields: {
    licensePlate: "License Plate",
    brand: "Brand",
    model: "Model",
    year: "Year",
    color: "Color",
    category: "Category",
    mileage: "Mileage",
    chassisNumber: "Chassis Number",
    engineNumber: "Engine Number",
    fuelTankCapacity: "Fuel Tank Capacity",
    tireSize: "Tire Size",
    acquisitionDate: "Acquisition Date",
    acquisitionValue: "Acquisition Value",
    notes: "Notes",
    status: "Status",
    createdAt: "Registration Date",
    updatedAt: "Last Update",
    gpsImei: "IMEI / GPS ID",
    gpsImeiOptional: "(optional)",
    gpsImeiEditHint: "To link or remove the GPS device, close this dialog and use \"View details\" → Register/Remove GPS.",
    gpsImeiCreationHint: "If filled in, the GPS device is created automatically on the tracking server.",
  },

  placeholders: {
    search: "Search by license plate, brand or model...",
    licensePlate: "LD-00-00-AA",
    brand: "Toyota",
    model: "Hilux",
    color: "White",
    chassisNumber: "00000000000000000",
    engineNumber: "0000000000",
    notes: "Additional information about the vehicle...",
    selectCategory: "Select category",
    categoryName: "Ex: Utility, Passenger, Cargo...",
    categoryDescription: "Ex: Vehicles for light cargo transport...",
    searchCategory: 'Search category...',
    tireSize: "Ex: 205/55 R16",
    gpsImei: "e.g. 353926070024734",
    selectImei: "Select GPS device...",
    searchImei: "Search device or IMEI...",
  },

  actions: {
    view: "View Details",
    activate: "Activate",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    create: "New Vehicle",
    update: "Update",
    activating: "Activating...",
    creating: "Creating...",
    updating: "Updating...",
    deleting: "Deleting...",
    updateMileage: "Update Mileage",
    changeStatus: "Change Status",
    editData: "Edit Data"
  },

  dialogs: {
    addGps: {
      title: "Add GPS to vehicle",
      description: "This vehicle has no GPS device configured yet. Enter the IMEI to enable tracking.",
      hint: "The device will be registered on the tracking server and linked to this vehicle.",
      badge: "Add GPS",
      action: "Add GPS",
      tooltip: "Register GPS device on this vehicle",
      register: "Register GPS",
      registering: "Registering...",
      imeiLoading: "Loading devices...",
      noImeiAvailable: "No devices available. Register a device first.",
      clearImei: "No GPS (remove link)",
    },
    new: {
      title: "New Vehicle",
      description: "Register a new vehicle in the fleet"
    },
    edit: {
      title: "Edit Vehicle",
      description: "Complete editing of all vehicle information",
      technicalHint: "These data are useful for",
      technicalHint1: "Unique vehicle identification",
      technicalHint2: "Fuel consumption calculation",
      technicalHint3: "Documentation and insurance",
      valueInCents: "Value stored in cents",
      notesInfo: "Status changes are automatically recorded here",
    },
    view: {
      title: "Vehicle Details",
      quickUpdates: "Quick Updates",
      vehicleData: "Vehicle Data",
      technicalData: "Technical Data",
      acquisition: "Acquisition",
      registrationInfo: "Records",
      noNotes: "No notes registered",
      fullEditHint: "For complete editing, use the 'Edit' button in the main list",
      syncInfo: "GPS",
      gpsDevice: "GPS / IMEI",
      noGps: "No GPS",
      gpsDeviceMissing: "This device is no longer responding on the Traccar server. It may have been removed or renamed — investigate or remove the link.",
    },
    delete: {
      title: "Delete Vehicle",
      description: "Are you sure you want to delete the vehicle",
      warning: "This action cannot be undone.",
      warningWithGps: "This vehicle has an active GPS device (IMEI: {{imei}}). On confirmation, the IMEI will be automatically disassociated and the device will be available for reuse. This action cannot be undone.",
    },
    mileage: {
      title: "Update Mileage",
      description: "Record new odometer reading",
      current: "Current Mileage",
      new: "New Mileage",
      confirm: "Confirm Update",
      difference: "Diference",
    },
    status: {
      title: "Change Vehicle Status",
      currentStatus: "Current Status",
      newStatus: "New Status",
      reason: "Reason / Notes",
      reasonPlaceholder: "E.g.: Vehicle sent for 50,000 km service. Expected return: 03/15/2024",
      reasonHelper: "This note will be automatically added to the vehicle history",
      infoTitle: "Status Change",
      infoDescription: "Complete change history will be recorded in the system for future audit.",
      auto: "Via trip system",
      inUseWarning: "Vehicle in use. Status will be updated automatically when the trip is completed.",
      inUseBlocked: "In use - Blocked"
    }
  },

  categories: {
    title: "Vehicle Categories",
    new: "New Category",
    edit: "Edit Category",
    delete: "Delete Category",
    name: "Category Name",
    description: "Description",
    color: "Color",
    active: "Active",
    inactive: "Inactive",
    noDescription: "No description defined",
    created: "Category created successfully",
    updated: "Category updated successfully",
    deleted: "Category deleted successfully",
    newDescription: "Create a new category to organize your vehicles",
    editDescription: "Update vehicle category information",
    deleteDescription: "Are you sure you want to delete the vehicle category",
    namePlaceholder: "Category Name",
    descriptionPlaceholder: "Category description",
    colorHint: "The color helps visually identify the category",
    colorTip: "Choose different colors for each category to make it easier to visually identify vehicles",
    available: 'Available categories',
  },

  gps: {
    trackingLabel:        'Real-time tracking',
    trackingEnabledDesc:  'Vehicle appears on the map with real-time updates',
    trackingDisabledDesc: 'Vehicle does not appear on the map. GPS device remains active on Traccar',
    trackingPaused:       'Tracking paused',
    enableTracking:       'Enable tracking',
    disableTracking:      'Pause tracking',
    registerDialog: {
      title:            'Register GPS device',
      imeiLabel:        'IMEI / Unique identifier',
      imeiPlaceholder:  'e.g. 123456789012345',
      imeiDesc:         'Unique identifier of the GPS device installed in the vehicle.',
      stepSyncing:      'Registering vehicle on the platform...',
      stepSyncingDesc:  'The vehicle was not yet synced with the platform. Creating record...',
      stepRegistering:      'Verifying IMEI and linking GPS to vehicle...',
      stepRegisteringDesc:  'Confirming that the device exists on the Traccar server and is not in use...',
      tryAgain:         'Try again',
      errorTitle: {
        GPS_DEVICE_ALREADY_LINKED:      'Device already in use',
        GPS_IMEI_NOT_FOUND:             'IMEI not found',
        GPS_VEHICLE_ALREADY_HAS_DEVICE: 'Vehicle already has GPS',
        SYNC_FAILED:                    'Sync error',
        UNKNOWN:                        'Error registering GPS',
      },
      imeiNotFoundHint: 'Make sure the device is already registered on the Traccar server and that devices have been synced.',
    },
    removeDialog: {
      title:       'Remove GPS device',
      description: 'Are you sure you want to unlink the GPS from this vehicle?',
      consequence: 'The vehicle will no longer appear on the map and real-time tracking will stop. The device remains registered on the Traccar server and can be linked to another vehicle.',
      removing:    'Removing...',
      confirm:     'Remove GPS',
    },
  },

  telemetry: {
    online:          'Online',
    onlineRealtime:  'Online — Real-time',
    offline:         'Offline',
    awaitingData:    'Awaiting device data...',
    notConnected:    'Tracking not connected',
    noPosition:      'No position available',
    recentAlerts:    'Recent Alerts',
    noAlerts:        'No alerts recorded for this vehicle',
    lastPosition:    'Last position',
    direction:       'Direction',
    coordinates:     'Coordinates',
  },

  tabs: {
    vehicles: "Vehicles",
    categories: "Categories",
    basic: "Basic",
    technical: "Technical",
    acquisition: "Acquisition",
    notes: "Notes",
  },

  filters: {
    all: "All statuses",
    allCategories: "All categories",
    status: "Filter by status",
    category: "Filter by category",
    imei: "GPS / IMEI",
    imeiAll: "All GPS",
    withImei: "With GPS (IMEI)",
    withoutImei: "Without GPS",
  },

  viewModes: {
    compact: "Compact",
    normal: "Normal",
    cards: "Cards"
  },

  table: {
    plate: "License Plate",
    vehicle: "Vehicle",
    category: "Category",
    status: "Status",
    actions: "Actions"
  },

  empty: {
    noVehicles: "No vehicles found",
    noCategories: "No categories found",
    adjustFilters: "Try adjusting your search filters.",
    noData: "No data to display"
  },

  loading: {
    vehicles: "Loading vehicles...",
    categories: "Loading categories...",
    syncing: "Syncing fleet..."
  },

  toast: {
    createSuccess: "Vehicle created successfully",
    createError: "Error creating vehicle",
    updateSuccess: "Vehicle updated successfully",
    categoryRestored: "Category activated successfully!",
    updateError: "Error updating vehicle",
    deleteSuccess: "Vehicle deleted successfully",
    deleteError: "Error deleting vehicle",
    mileageUpdateSuccess: "Mileage updated successfully",
    mileageUpdateError: "Error updating mileage",
    statusUpdateSuccess: "Status updated successfully",
    statusUpdateError: "Error updating status",
    addGpsSuccess: "GPS registered successfully on vehicle",
    addGpsError: "Error registering GPS on vehicle",
    gpsRegistered: "GPS registered. Device map updated.",
    categoryCreateSuccess: "Category created successfully",
    categoryCreateError: "Error creating category",
    categoryUpdateSuccess: "Category updated successfully",
    categoryUpdateError: "Error updating category",
    categoryDeleteSuccess: "Category deleted successfully",
    categoryDeleteError: "Error deleting category",
    gpsRemoved: "GPS device removed from vehicle",
    gpsRemoveError: "Error removing GPS device",
    trackingEnabled: "Tracking enabled",
    gpsGeofenceHint: "Tip: you can add this vehicle to a virtual zone to receive entry/exit alerts. Go to Map → Zones.",
    gpsNoGeofenceHint: "Tip: you have no virtual zones defined yet. Go to Map → Zones to create geofencing areas and receive automatic alerts.",
    trackingDisabled: "Tracking paused",
    trackingError: "Error updating tracking"
  },

  errors: {
    inUseOnlyByTrip: "The \"In use\" status is set automatically when a trip starts",
    statusLockedByTrip: "The vehicle has a trip in progress — finish or cancel the trip to change its status",
    statusLockedByMaintenance: "The vehicle has a maintenance in progress — complete or cancel it to change its status",
    errorLoading: "Error loading vehicles",
    errorLoadingCategories: "Error loading categories",
    vehicleNotFound: "Vehicle not found",
    vehicleAlreadyExists: "This vehicle already exists",
    vehicleWithSamePlate: "A vehicle with license plate {{plate}} already exists",
    vehicleInUse: "A vehicle with license plate {{plate}} is in use, it can't be modified",
    categoryNotFound: "Category not found",
    categoryHasVehicles: "Cannot delete: category linked to {{count}} vehicle(s)",
    categoryAlreadyExists: "A category with the name {{name}} already exists",
    mileageLessThanCurrent: "New mileage cannot be less than current",
    mileageDifferenceTooBig: "Mileage difference too large. Please verify the value",
    restoreFailed: "Error activating category",
    noCategoriesFound: 'No categories found',
    imeiRequiresConnected: "IMEI requires an active session — check your connection and sign in first",
    imeiAlreadyExists: "A device with this IMEI is already registered",
    traccarUnavailable: "Tracking server unreachable. Check the connection and try again",
    traccarError: "Error registering tracking device. Please try again",
    vehicleNotYetSynced: "The vehicle is still syncing with the server. Wait a few seconds and try again.",
    gpsImeiNotFound: "IMEI not found. Sync Traccar devices or register the device on the Traccar server first.",
    gpsDeviceAlreadyLinked: "This GPS device is already linked to another vehicle.",
    gpsVehicleAlreadyHasDevice: "This vehicle already has a GPS device registered. Remove it first.",
  },

  warnings: {
    noAvailableVehicles: "No available vehicles",
    categoryExistsInactive: "Category '{{name}}' exists but is inactive. Do you want to activate it?"
  },

  analytics: {
    utilizationRate: 'Utilization Rate',
    availability:    'Availability',
    avgMileage:      'Avg. Mileage',
    withGps:         'With GPS',
    fleetStatus:     'Fleet Status',
    topMileage:      'Top Mileage',
    byCategory:      'By Category',
    mileage:         'Mileage',
  },
} as const;