// ========================================
// FILE: src/locales/en/trips.ts
// ========================================
export const enTrips = {
  title: 'Trip Management',
  description: 'Manage fleet trips and routes',
  newTrip: 'Start Trip',
  noTrips: 'No trips registered',
  searchPlaceholder: 'Search by code, vehicle, driver, origin or destination...',

  stats: {
    total: 'Total',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    totalDistance: 'Total Distance',
    averageDistance: 'Average per Trip',
  },

  status: {
    in_progress: {
      label: 'In Progress',
      description: 'Trip currently underway',
    },
    completed: {
      label: 'Completed',
      description: 'Trip successfully completed',
    },
    cancelled: {
      label: 'Cancelled',
      description: 'Trip cancelled',
    },
  },

  fields: {
    tripCode: 'Trip Code',
    vehicle: 'Vehicle',
    driver: 'Driver',
    route: 'Route',
    origin: 'Origin',
    destination: 'Destination',
    startDate: 'Start Date/Time',
    endDate: 'End Date/Time',
    startMileage: 'Starting Mileage',
    endMileage: 'Ending Mileage',
    distance: 'Distance Traveled',
    duration: 'Duration',
    purpose: 'Purpose',
    notes: 'Notes',
    status: 'Status',
  },

  placeholders: {
    origin: 'E.g.: Luanda',
    destination: 'E.g.: Benguela',
    purpose: 'E.g.: Goods delivery',
    notes: 'Additional information about the trip...',
    endNotes: 'Record any relevant information here: road conditions, incidents, extra expenses, etc...',
  },

  actions: {
    actions: 'More',
    view: 'View Details',
    complete: 'Complete Trip',
    cancel: 'Cancel Trip',
    save: 'Save',
    start: 'Start Trip',
    starting: 'Starting...',
    completing: 'Completing...',
    cancelling: 'Cancelling...',
  },

  dialogs: {
    start: {
      title: 'Start New Trip',
      description: 'Select vehicle and driver to start a trip',
      tripType: 'Trip Type',
      useRoute: 'Use pre-registered route',
      useManual: 'Define origin/destination manually',
      selectRoute: 'Select a registered route',
      routeDetails: 'Route Details',
      estimatedDistance: 'Estimated Distance',
      estimatedDuration: 'Estimated Duration',
      verifyMileage: 'Check vehicle odometer before departure',
      noVehicles: 'No vehicles available',
      noDrivers: 'No drivers available',
      noRoutes: 'No routes registered',
    },
    complete: {
      title: 'Complete Trip',
      description: 'Record final mileage and observations',
      distanceCalculated: 'Distance Traveled',
    },
    view: {
      title: 'Trip Details',
      vehicleAndDriver: 'Vehicle and Driver',
      tripDetails: 'Trip Details',
      mileageInfo: 'Mileage',
      initialKm: 'Initial KM',
      finalKm: 'Final KM',
      list: "List",
      cards: "Cards"
    },
    cancel: {
      title: 'Cancel Trip',
      description: 'Are you sure you want to cancel the trip',
      warning: 'This action cannot be undone. The vehicle and driver will become available again.',
    },
  },

  alerts: {
    selectRoute: 'Select a route',
    selectOriginDestination: 'Enter origin and destination',
    endMileageError: 'Final mileage must be greater than initial mileage',
    tripStarted: 'Trip started successfully',
    tripCompleted: 'Trip completed successfully',
    tripCancelled: 'Trip cancelled successfully',
  },

  toast: {
    createSuccess: 'Trip started successfully',
    createError: 'Error starting trip',
    completeSuccess: 'Trip completed successfully',
    completeError: 'Error completing trip',
    cancelSuccess: 'Trip cancelled successfully',
    cancelError: 'Error cancelling trip',
  },

  errors: {
    vehicleInMaintenance: 'The vehicle has a maintenance in progress — complete it before starting a trip',
    errorLoading: 'Error loading trips',
    routeNotFound: 'Route not found',
    originDestinationRequired: 'Origin and destination are required',
    endMileageLowerThanStart: 'Final mileage must be greater than initial mileage',
    tripNotFound: 'Trip not found',
    vehicleNotAvailable: 'Vehicle is not available',
    driverNotAvailable: 'Driver is not available',
  },

  validation: {
    tripNotInProgress: 'Trip not in progress',
    vehicleRequired: 'Vehicle is required',
    driverRequired: 'Driver is required',
    startMileageRequired: 'Starting mileage is required',
    endMileageRequired: 'Ending mileage is required',
    routeOrManualRequired: 'Select a route or enter origin/destination',
  },

  info: {
    auto: 'Auto',
    mileageAutoFilled: 'Mileage automatically filled - ({{mileage}} km)',
    startedAt: 'Started at',
    completedAt: 'Completed at',
    currentlyInProgress: 'Currently in progress',
    kmInitial: 'Initial KM',
    noObservations: 'No observations recorded',
    inProgressCount: '{{count}} in progress',
    completedCount: '{{count}} completed',
    hours: '{{count}}h',
  },

  filters: {
    all: 'All statuses',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },

  tabs: {
    all: 'All',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    trips: 'Trips',
    routes: 'Routes',
  },

  table: {
      code: "Code",
      route: "Route",
      vehicle: "Vehicle",
      driver: "Driver",
      status: "Status",
      actions: "Actions"
  },

  analytics: {
    completionRate:   'Completion Rate',
    inProgress:       'In Progress',
    cancelled:        'Cancelled',
    totalDistance:    'Total Distance',
    tripsStatus:      'Trip Status',
    statusInProgress: 'In Progress',
    statusCompleted:  'Completed',
    statusCancelled:  'Cancelled',
  },
} as const;

export default enTrips;