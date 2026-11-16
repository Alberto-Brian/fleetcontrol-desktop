// ========================================
// FILE: src/locales/en/help.ts
// ========================================
export const enHelp = {
  search: { placeholder: 'Search help...' },
  noResults: 'No results for',
  footer: 'FleetControl · AKM Systems',

  sections: [
    // ─── INTRODUCTION ─────────────────────────────────────────────────────────
    {
      id: 'intro',
      title: 'Introduction to FleetControl',
      content: [
        { type: 'text', text: 'FleetControl is a fleet management system for monitoring vehicles, drivers, trips, fuel, maintenance, expenses, and fines. It includes real-time GPS tracking via Traccar.' },
        { type: 'text', text: 'The Desktop connects to the FleetControl server (license key starts with LK-) and syncs data automatically; it keeps working temporarily without an internet connection, syncing again as soon as the connection returns.' },
      ],
    },

    // ─── DASHBOARD ────────────────────────────────────────────────────────────
    {
      id: 'dashboard',
      title: 'Dashboard',
      content: [
        { type: 'text', text: 'The Dashboard shows a summary of the current fleet status with key metrics and quick access to the main sections.' },
        { type: 'list', items: [
          'Summary of active vehicles, vehicles in maintenance, and out-of-service vehicles',
          'Recent trips and fuel statistics',
          'Alerts for pending maintenance and expiring driver licenses',
          'Shortcuts to the most-used sections',
        ]},
        { type: 'tip', text: 'Click on summary cards to navigate directly to the corresponding section.' },
      ],
    },

    // ─── ANALYTICS PANELS ─────────────────────────────────────────────────────
    {
      id: 'analytics',
      title: 'Analytics Panels',
      content: [
        { type: 'text', text: 'Each main section (Vehicles, Drivers, Trips, Fuel, Maintenance, Expenses) has an analytics panel with KPIs and charts. The panel always reflects all records matching your active filters — not just the records visible on the current page. Changing a filter instantly updates the analytics; the pagination does not affect them.' },
        { type: 'text', text: 'Panel layout — configurable under Settings › Views:' },
        { type: 'list', items: [
          'Vertical (default) — fixed panel to the right of the listing, follows scroll. In this layout, the view mode buttons (compact/list/cards) move to the pagination line.',
          'Horizontal — panel appears above the listing, spans full width.',
          'You can also enable or disable the analytics panel per module individually.',
        ]},
        { type: 'text', text: 'Percentage metrics explained:' },
        { type: 'table',
          headers: ['Metric', 'Module', 'How it is calculated'],
          rows: [
            ['Utilisation rate', 'Vehicles', 'Vehicles currently in use ÷ total active vehicles × 100. Shows what fraction of your active fleet is being used right now.'],
            ['Availability', 'Vehicles', 'Vehicles with status "available" ÷ total active vehicles × 100. Shows what fraction of your active fleet is free and ready to be assigned.'],
            ['Availability rate', 'Drivers', 'Drivers with status "available" ÷ total active drivers × 100. Shows how many of your active drivers are currently free.'],
            ['Completion rate', 'Trips', 'Completed trips ÷ total trips (in current filter) × 100. Shows the proportion of trips that reached their destination.'],
            ['Payment rate', 'Expenses', 'Paid expenses ÷ total expenses (in current filter) × 100. Shows what fraction of logged expenses have been settled.'],
          ],
        },
        { type: 'text', text: 'KPIs and charts per module:' },
        { type: 'table',
          headers: ['Module', 'KPIs', 'Charts'],
          rows: [
            ['Vehicles', 'Utilisation rate, availability, average mileage, vehicles with GPS', 'Fleet status donut, top mileage bar chart, by category bar chart'],
            ['Drivers', 'Availability rate, on trip, on leave, licences expiring (30 days)', 'Availability donut, by licence category bar chart'],
            ['Trips', 'Completion rate, in progress, cancelled, total distance', 'Trip status donut'],
            ['Fuel', 'Total cost, total litres, average price/L, number of fill-ups', 'Cost per vehicle bar chart'],
            ['Maintenance', 'Total, scheduled, in progress, total cost', 'Status donut, cost per vehicle bar chart'],
            ['Expenses', 'Total expenses, total value, paid, payment rate', 'Status donut, value by category bar chart'],
          ],
        },
        { type: 'tip', text: 'Large values are automatically abbreviated (e.g. 85,300 km → "85.3K km"). Hover over a KPI tile to see the full value in a tooltip showing the metric name and exact number.' },
      ],
    },

    // ─── VEHICLES ─────────────────────────────────────────────────────────────
    {
      id: 'vehicles',
      title: 'Vehicles',
      content: [
        { type: 'text', text: 'Manage your entire fleet: register, edit and view the history of each vehicle.' },
        { type: 'list', items: [
          'Full record: licence plate, make, model, year, colour, category',
          'Chassis number and current status (active, in maintenance, inactive)',
          'Current mileage and update history',
          'Trip, fuel and maintenance history per vehicle',
          'Association with GPS tracking device by IMEI',
        ]},
        { type: 'steps', steps: [
          'Click "+ New Vehicle" in the top-right corner',
          'Fill in required fields: licence plate, make, model',
          'Select the category and initial status',
          'Save the record',
        ]},
        { type: 'text', text: 'GPS actions available per vehicle:' },
        { type: 'list', items: [
          'Register GPS: links the IMEI to the vehicle — after registration, the system suggests adding the vehicle to a geofencing zone',
          'Remove GPS: unlinks the device; the device name in Traccar automatically changes to "GPS-XXXXXX" (last 6 IMEI digits), indicating it is available for reuse',
          'To change IMEI: remove the current GPS and register the new one — there is no direct IMEI update',
          'Pause tracking: the vehicle stops appearing on the map but keeps its GPS association — can be resumed at any time',
          'Resume tracking: the vehicle reappears on the map with real-time updates',
          'Delete a vehicle with active GPS: the system warns that the IMEI will be unlinked before deletion and asks for confirmation',
        ]},
        { type: 'tip', text: 'The "GPS Devices" panel (button in the map toolbar) lets you filter devices with or without an associated vehicle, making it easy to manage free IMEIs.' },
        { type: 'tip', text: 'When filters are active, a "Clear filters" button appears to reset them all at once (shown in the toolbar or pagination row depending on the layout).' },
        { type: 'text', text: 'GPS actions (Register, Remove, pause/resume tracking) only appear for someone with the matching permission — check My Profile to see exactly what you can do. A device can no longer be linked to two vehicles at once; the system rejects it and shows which vehicle it already belongs to.' },
        { type: 'warning', text: 'If a vehicle with GPS shows the "device no longer responding on Traccar" warning, the server no longer recognizes it (it may have been deleted or renamed directly on Traccar). The system never unlinks it automatically — investigate or remove the link manually.' },
      ],
    },

    // ─── DRIVERS ──────────────────────────────────────────────────────────────
    {
      id: 'drivers',
      title: 'Drivers',
      content: [
        { type: 'text', text: 'Each driver has two independent states: the contractual status and the operational availability. It is important to understand which you can change manually and which is managed automatically by the system.' },
        { type: 'text', text: 'Contractual Status — defines the driver\'s employment relationship with the company:' },
        { type: 'table',
          headers: ['Status', 'Meaning', 'Set by'],
          rows: [
            ['Active', 'Driver currently employed at the company', 'User'],
            ['On Leave', 'Temporary absence: vacation, sick leave, etc.', 'Automatic (Leaves module) or user'],
            ['Terminated', 'Employment contract ended — driver permanently inactive', 'User'],
          ],
        },
        { type: 'warning', text: 'You cannot change the contractual status while the driver has an active trip. Complete the trip first.' },
        { type: 'text', text: 'Operational Availability — indicates whether the driver is ready to be assigned to a trip:' },
        { type: 'table',
          headers: ['Availability', 'Meaning', 'Set by'],
          rows: [
            ['Available', 'Ready to be assigned to a trip', 'User or automatic (when a trip or leave ends)'],
            ['On Trip', 'Driving — assigned to an active trip', 'Automatic (Trips module)'],
            ['Offline', 'Temporarily unavailable for another reason', 'User or automatic (when a leave starts)'],
          ],
        },
        { type: 'tip', text: 'When creating a trip, only drivers with "Available" operational availability and "Active" contractual status appear for selection.' },
        { type: 'text', text: 'Automation rules:' },
        { type: 'list', items: [
          'When a trip starts → availability automatically changes to "On Trip"',
          'When the trip ends → availability automatically returns to "Available"',
          'When a leave is activated → availability automatically changes to "Offline"',
          'When the leave ends → availability automatically returns to "Available"',
          'Availability cannot be changed manually while the driver is On Trip',
        ]},
        { type: 'tip', text: 'Shifts and leaves are stored on the server and show up on every workstation of the organization. Leaves are started and ended automatically by someone allowed to manage leaves; if the driver is on a trip on the start day, the leave waits for the trip to end.' },
      ],
    },

    // ─── TRIPS ────────────────────────────────────────────────────────────────
    {
      id: 'trips',
      title: 'Trips',
      content: [
        { type: 'text', text: 'Record and track all fleet trips: origin, destination, vehicle, driver, kilometres and costs.' },
        { type: 'list', items: [
          'Assigned vehicle and driver',
          'Origin, destination and trip purpose',
          'Departure and arrival date/time',
          'Kilometres travelled (initial and final odometer)',
          'Trip cost and additional notes',
        ]},
        { type: 'steps', steps: [
          'Click "+ New Trip"',
          'Select the vehicle and available driver',
          'Set origin, destination and departure date',
          'Record the initial odometer',
          'On completion, update with arrival date and final odometer',
        ]},
        { type: 'tip', text: 'Trips can be correlated with GPS routes recorded automatically by Traccar.' },
        { type: 'tip', text: 'If two workstations change the same vehicle or driver at the same time (e.g. both put it on a trip), the server accepts only the first action. The second is refused entirely, with a notice; the data refreshes on its own and you just need to check and try again. A trip is never saved with the vehicle left "available".' },
        { type: 'tip', text: 'Vehicle and driver status follow what is active: with a trip in progress the vehicle is "In use"; with a maintenance in progress it is "Maintenance"; it is only "Available" when neither is open. So you cannot manually change the status of a vehicle with an open trip or maintenance, nor start a maintenance on a vehicle on a trip — finish or cancel first.' },
      ],
    },

    // ─── FUEL ─────────────────────────────────────────────────────────────────
    {
      id: 'fuel',
      title: 'Fuel',
      content: [
        { type: 'text', text: 'Record all fleet fuel fill-ups to control consumption and costs.' },
        { type: 'list', items: [
          'Vehicle, date and location of fill-up',
          'Litres filled, price per litre and total cost',
          'Odometer reading at the time of fill-up',
          'Fuel type (diesel, petrol, LPG, electric, etc.)',
          'Automatic average consumption calculation (km/L)',
        ]},
        { type: 'tip', text: 'Always record the odometer at each fill-up so the system can calculate average consumption accurately.' },
      ],
    },

    // ─── MAINTENANCE ──────────────────────────────────────────────────────────
    {
      id: 'maintenance',
      title: 'Maintenance',
      content: [
        { type: 'text', text: 'Manage preventive and corrective maintenance for all fleet vehicles.' },
        { type: 'list', items: [
          'Type: preventive, corrective',
          'Description of work performed, diagnosis and solution',
          'Service provider/garage, entry date and exit date',
          'Vehicle mileage at entry and next scheduled maintenance mileage',
          'Parts, labour and total costs',
          'Priority: low, normal, high, urgent',
          'Work order number (optional)',
        ]},
        { type: 'warning', text: 'When a vehicle enters maintenance, its status changes automatically. Mark maintenance as completed when work is finished to return the vehicle to service.' },
        { type: 'tip', text: 'Set the next maintenance mileage when creating or completing a record. The system will automatically alert you at the top of the page when the vehicle approaches that value.' },
      ],
    },

    // ─── EXPENSES ─────────────────────────────────────────────────────────────
    {
      id: 'expenses',
      title: 'Expenses',
      content: [
        { type: 'text', text: 'Record all operational fleet expenses, per vehicle or in general.' },
        { type: 'list', items: [
          'Expense category (toll, wash, insurance, inspection, etc.)',
          'Associated vehicle — optional for general fleet expenses',
          'Date, description, amount and status (pending, paid, cancelled)',
          'Expense reports by period, vehicle or category',
        ]},
        { type: 'tip', text: 'Create custom categories under Categories to better organise expenses specific to your operation.' },
        { type: 'tip', text: 'The Expenses analytics panel shows total, accumulated value, payment rate and distribution by category (data from the current page). Enable it under Settings › Views.' },
      ],
    },

    // ─── FINES ────────────────────────────────────────────────────────────────
    {
      id: 'fines',
      title: 'Fines',
      content: [
        { type: 'text', text: 'Record and track traffic fines associated with fleet vehicles.' },
        { type: 'list', items: [
          'Vehicle and driver associated with the infraction',
          'Date, location and type of infraction',
          'Fine amount and payment deadline',
          'Payment status: pending, paid, contested',
          'Responsible party: company or driver',
        ]},
        { type: 'tip', text: 'Set who is responsible for payment (company or driver) when registering or editing the fine. That field appears in the record detail to facilitate cost allocation.' },
      ],
    },

    // ─── LISTINGS AND FILTERS ─────────────────────────────────────────────────
    {
      id: 'listing-preferences',
      title: 'Listings, Filters and Views',
      content: [
        { type: 'text', text: 'All main sections share the same listing system with filters, view modes and pagination.' },
        { type: 'text', text: 'View modes — available in the toolbar of each section:' },
        { type: 'list', items: [
          'Compact — dense rows, more records visible per screen',
          'List — standard rows with more detail per item',
          'Cards — card grid with visually highlighted information',
        ]},
        { type: 'tip', text: 'In vertical analytics layout, the view mode buttons move to the pagination line (left of the page controls) to avoid duplicating the main toolbar.' },
        { type: 'text', text: 'Filters and search:' },
        { type: 'list', items: [
          'Real-time free-text search bar',
          'Filters by status, category, and other fields depending on the section',
          '"Clear filters" button — appears whenever filters are active, in the toolbar (vertical mode) or in the pagination row; resets all filters at once',
          'Column sorting by clicking the table header',
        ]},
        { type: 'text', text: 'Listing preferences (Settings › Appearance › Listing Preferences):' },
        { type: 'table',
          headers: ['Preference', 'Default', 'What it does'],
          rows: [
            ['Save filters across sessions', 'Off', 'Keeps active filters when closing and reopening the app'],
            ['Save view mode', 'On', 'Remembers the compact/list/cards choice between sessions'],
            ['Save items per page', 'Off', 'Remembers how many items to show per page in each listing'],
            ['Save current page', 'Off', 'Resumes the last visited page when reopening a listing'],
          ],
        },
        { type: 'tip', text: 'Enabling "Save filters" is useful when you frequently work with the same filters (e.g. only active vehicles or a specific category).' },
      ],
    },

    // ─── REPORTS ──────────────────────────────────────────────────────────────
    {
      id: 'reports',
      title: 'Reports',
      content: [
        { type: 'text', text: 'Generate detailed reports from all system modules, exportable as PDF.' },
        { type: 'list', items: [
          'Trip report by period, vehicle or driver',
          'Fuel consumption and costs per vehicle',
          'Maintenance history and associated costs',
          'Expense report by category or period',
          'General fleet summary',
        ]},
        { type: 'text', text: 'PDF headers use the information configured under Settings › Company (logo, name, contacts). Under Settings › PDF Reports you can customise:' },
        { type: 'list', items: [
          'Watermark (company text or logo, with adjustable opacity)',
          'Header and badge colours (primary and secondary colour)',
          'Inclusion of charts, footer and executive summary',
          'Paper size and orientation',
          'Value format: compact (K/M) or full numbers',
          'Show or hide currency symbol (Kz)',
        ]},
        { type: 'tip', text: 'In historical mode you can generate reports from old databases without affecting current data. See the "Databases" section to learn how to activate this mode.' },
      ],
    },

    // ─── GPS TRACKING ─────────────────────────────────────────────────────────
    {
      id: 'tracking',
      title: 'GPS Tracking',
      content: [
        { type: 'text', text: 'The GPS tracking module allows real-time monitoring of the position of all GPS-equipped vehicles via the Traccar server.' },
        { type: 'list', items: [
          'Real-time map with position of all devices',
          'Speed, heading and last update for each vehicle',
          'Route history per device and period',
          'Geofencing zones with entry/exit alerts',
          'Excessive speed and ignition status alerts',
          'Map layers: streets, satellite, hybrid, terrain',
        ]},
        { type: 'text', text: 'Geofencing Zones — Define geographic areas on the map to receive alerts when a vehicle enters or exits those zones:' },
        { type: 'steps', steps: [
          'Go to the "Zones" tab in the map sidebar',
          'Click "Circle" or "Polygon" and draw the zone directly on the map',
          'Give the zone a name and set a speed limit (optional)',
          'Save — the zone is synchronised with the Traccar server',
          'Enable entry/exit notifications under Settings › GPS Alerts',
        ]},
        { type: 'tip', text: 'Use the "View all devices" button in the toolbar to centre the map on the entire fleet at once.' },
        { type: 'list', items: [
          'The map shows only vehicles with active GPS and tracking enabled',
          'Vehicles with paused tracking appear in the sidebar list with the "Tracking paused" badge but have no marker on the map',
          'The "GPS Devices" panel (toolbar button) lists all Traccar devices with search by name, IMEI or licence plate',
          'After a backup restore, the app automatically checks IMEIs and warns when any has no match in Traccar',
        ]},
      ],
    },

    // ─── GPS NOTIFICATIONS ────────────────────────────────────────────────────
    {
      id: 'notifications',
      title: 'GPS Notifications',
      content: [
        { type: 'text', text: 'FleetControl uses two types of notification for GPS alerts:' },
        { type: 'list', items: [
          'Internal (toast) notifications — appear inside the application when it is in focus',
          'Native OS notifications — appear in the operating system when the application is minimised or in the background',
        ]},
        { type: 'table',
          headers: ['Application state', 'Notification type'],
          rows: [
            ['In focus (active window)', 'Internal toast notification in the corner of the screen'],
            ['Minimised or in background', 'Native operating system notification'],
          ],
        },
        { type: 'tip', text: 'Enable/disable native notifications under Settings › GPS Alerts. Each event type can be configured individually, including a minimum interval (cooldown) between notifications of the same type.' },
        { type: 'text', text: 'Alerts Panel — Click "Alerts" in the map toolbar to access the history. The panel includes:' },
        { type: 'list', items: [
          'Search by device name, event type or zone name',
          'Tabs: All / Unread / Read — with count on each tab',
          'Stats bar: total unread, read and period covered',
          'Clicking an alert opens the detail with coordinates, date/time and option to centre on the map',
          'Mark alerts individually or all as read with one click',
        ]},
        { type: 'text', text: 'Configurable event types under Settings › GPS Alerts:' },
        { type: 'list', items: [
          'Zone entry — vehicle enters a geofencing zone',
          'Zone exit — vehicle exits a geofencing zone',
          'Excessive speed — vehicle exceeds the set limit',
          'Ignition on — engine starts',
          'Ignition off — engine stops',
        ]},
      ],
    },

    // ─── DATABASES ────────────────────────────────────────────────────────────
    {
      id: 'databases',
      title: 'Databases (Historical Mode)',
      content: [
        { type: 'text', text: 'The system automatically saves database backups. The "Databases" tab in Settings lets you temporarily activate an old database to browse historical records and generate reports.' },
        { type: 'text', text: 'When you activate a historical database:' },
        { type: 'list', items: [
          'An orange banner appears at the top of all pages indicating you are in historical mode',
          'All listings (vehicles, trips, drivers, etc.) show data from that database',
          'You can generate reports from historical data normally',
          'Adding, editing or deleting data is not possible — read-only mode',
        ]},
        { type: 'steps', steps: [
          'Go to Settings › Databases',
          'Click a database in the list to expand its details',
          'Click "Activate" to enter historical mode',
          'Navigate to any section or Reports to browse historical data',
          'Click "Deactivate" in the orange banner at the top of the screen to return to the current database',
        ]},
        { type: 'warning', text: 'In historical mode no data changes are possible. Deactivate historical mode to resume normal work.' },
      ],
    },

    // ─── DATABASE MANAGEMENT ──────────────────────────────────────────────────
    {
      id: 'db-management',
      title: 'Database Management',
      content: [
        { type: 'text', text: 'FleetControl stores all data locally in a SQLite file. With continuous use, that file grows over time. The developer zone in Settings › Databases offers three management modes to control database size:' },
        { type: 'table',
          headers: ['Mode', 'What it does'],
          rows: [
            ['Disabled', 'No automatic management. The system only alerts when the database exceeds 150 MB. The developer deletes data manually when needed.'],
            ['Rotation', 'When the database reaches the configured size or age limit, the system automatically creates a new database, archives the current one, and copies the most recent data into the new one.'],
            ['Retention', 'Instead of creating a new database, the system directly deletes old records from transactional tables (trips, expenses, etc.) based on a retention period defined per table.'],
          ],
        },
        { type: 'text', text: 'Rotation — how it works:' },
        { type: 'list', items: [
          'The system checks two conditions: file size (MB) and database age (days)',
          'When either condition is met, rotation occurs automatically on the next startup — or can be forced manually',
          'The old database is archived (not deleted) and remains accessible in historical mode',
          'The most recent data (configurable as "days to copy") is copied to the new database: master tables (vehicles, drivers, routes, etc.) are copied in full; transactional tables (trips, expenses, etc.) only within the configured period',
          'The license and all system settings are preserved in the new database',
        ]},
        { type: 'text', text: 'Retention — how it works:' },
        { type: 'list', items: [
          'Select which transactional tables are managed and define a retention period for each (e.g. keep last 60 days of trips)',
          'Clicking "Apply Retention Now" permanently deletes records older than the period from the active database',
          'Master tables (vehicles, drivers, etc.) are never affected — only transactional data',
          'The database remains a single file — no new databases are created',
        ]},
        { type: 'warning', text: 'Both forced rotation and applying retention are irreversible operations. Always create a backup before performing either of these actions.' },
        { type: 'tip', text: 'Rotation mode is ideal for systems in continuous use over years: it creates an organised history by period. Retention mode is ideal if you want to keep the database small without accumulating historical files.' },
        { type: 'tip', text: 'To restore a backup or access the developer zone, open Settings › Databases and enter the developer PIN. The unlock session lasts until the application is closed.' },
      ],
    },

    // ─── PROFILE ──────────────────────────────────────────────────────────────
    {
      id: 'profile',
      title: 'My Profile',
      content: [
        { type: 'text', text: 'Access your profile through the user avatar/menu in the top-right corner, "Profile" option. You can update your name, email and photo there.' },
        { type: 'text', text: 'The "Access" section shows, for each Scope you belong to (whole organization or a specific set of vehicles/drivers), exactly which permissions you have in that Scope — so you know right away what you can or can\'t do in the system, without having to try and find out from an error.' },
        { type: 'list', items: [
          'Each permission appears as resource:action (e.g. vehicle:read, vehicle:link-device) — the same code the system uses internally to decide what to authorize',
          'A "whole organization" Scope gives you that permission across the entire fleet; a "specific resources" Scope only for the vehicles/drivers included in that Scope',
          'If you don\'t see a permission for an action (e.g. GPS, editing vehicles), the corresponding buttons are disabled in the relevant screens (hovering shows "No permission"), and if you try the action it is refused right away with a red notice, without being saved — that\'s not a bug, it\'s your current access',
        ]},
        { type: 'tip', text: 'This list is for reference only — the server always makes the real decision on every request. If something looks wrong, contact an Administrator of your organization to review your Scope/permissions.' },
      ],
    },

    // ─── LICENSE ──────────────────────────────────────────────────────────────
    {
      id: 'license',
      title: 'License & Activation',
      content: [
        { type: 'text', text: 'FleetControl is activated with a license key provided by AKM Systems (starts with LK-), linked to the customer\'s Organization — server, real-time GPS tracking, and multi-user support.' },
        { type: 'steps', steps: [
          'On first launch (or under Settings › License › "Reactivate")',
          'Paste the short code provided by AKM Systems, in the format LK-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
          'Click "Activate System"',
          'The system becomes operational immediately',
        ]},
        { type: 'tip', text: 'If you received a license file (.txt) with a "FULL:" line instead of a short code, click "I have a full key (advanced)" on the activation screen to paste that long key instead.' },
        { type: 'warning', text: 'Keep your license key in a safe place. If lost, contact AKM Systems for assistance.' },
        { type: 'tip', text: 'The connected key (LK-) is linked to your organisation on the server. You can use the same key to activate FleetControl on another computer.' },
        { type: 'text', text: 'Connected mode without an Internet connection:' },
        { type: 'list', items: [
          'If the app loses connectivity, it keeps working with the last valid session — a bar appears at the top telling you that you are offline',
          'While offline, the role and permissions shown are the last known ones, not a live, real-time check',
          'If the saved session expires before you reconnect, you will need to sign in again once you are back online',
          'If you see "Session ended", an administrator has terminated your session remotely — sign in again',
        ]},
        { type: 'tip', text: 'When connectivity returns, the app renews the session automatically in the background — no action needed. Any changes an administrator made to your access (e.g. a role change) only take effect once you reconnect.' },
      ],
    },

    // ─── SETTINGS OVERVIEW ────────────────────────────────────────────────────
    {
      id: 'settings',
      title: 'Settings — Overview',
      content: [
        { type: 'text', text: 'Access Settings via the gear icon in the top-right of the panel. There is a search bar at the top of the Settings dialog to quickly find any option.' },
        { type: 'tip', text: 'To change the interface language, click the flag icon in the top-right bar (next to the help button). A dropdown with the available languages will appear.' },
        { type: 'table',
          headers: ['Tab', 'What you configure'],
          rows: [
            ['Appearance', 'Theme (light/dark), font family, text size, layout padding, sidebar collapse, glass panel, listing preferences'],
            ['Views', 'Analytics panels per section (on/off) and layout position (vertical/horizontal)'],
            ['Company', 'Company name, logo, NIF, phone, email, address and currency'],
            ['PDF Reports', 'Header, colours, watermark, charts, format and orientation of exported PDFs'],
            ['GPS Alerts', 'Which GPS events (geofencing, speed, ignition) generate alerts and cooldown between notifications of the same type'],
            ['Backups', 'Location and frequency of automatic database backups'],
            ['Databases', 'List and activate historical databases for browsing'],
            ['Server', 'Connection settings to the FleetControl API'],
            ['Sync', 'Automatic sync (PowerSync) status and sync sound/notifications'],
            ['License', 'Information about the active license, users/sessions (seats) and expiry'],
            ['About', 'Application version and technical information'],
          ],
        },
      ],
    },

    // ─── SETTINGS — APPEARANCE ────────────────────────────────────────────────
    {
      id: 'settings-appearance',
      title: 'Settings — Appearance',
      content: [
        { type: 'text', text: 'The Appearance tab groups all visual interface options.' },
        { type: 'text', text: 'Theme:' },
        { type: 'list', items: [
          'Toggle between Light Mode and Dark Mode with the moon/sun button',
          'The theme is applied immediately across the entire interface',
        ]},
        { type: 'text', text: 'Typography:' },
        { type: 'list', items: [
          'Font family — choose from available fonts (e.g. Geist, Inter, etc.)',
          'Text size — adjust the interface base size (affects all text proportionally)',
        ]},
        { type: 'text', text: 'Layout:' },
        { type: 'list', items: [
          'Padding — adds inner padding to pages for a more spacious reading experience',
          'Compact sidebar — reduces the width of the side menu to free up content space',
          'Auto-collapse sidebar — collapses the sidebar automatically when navigating to a section',
        ]},
        { type: 'text', text: 'Glass Panel — controls the translucent glass panel of the interface:' },
        { type: 'list', items: [
          'Opacity — from 40% (transparent) to 100% (solid)',
          'Blur — from 0px (no blur) to 40px (maximum blur)',
          'The "Reset" button adapts to the active theme: shows only "Dark mode" (default: 95% / 15px) or "Light mode" (default: 48% / 13px)',
          '"Save as default" — the button appears automatically when you move a control in this session; saving stores the values as the default for the active theme',
          'The save button animates with a green checkmark on confirm, then fades out smoothly',
          '"Reset on theme change" — toggle that automatically applies the new theme\'s defaults whenever you switch between light and dark',
        ]},
        { type: 'tip', text: 'To set different values for each theme: switch to dark mode, adjust the controls, click "Save (dark)"; then switch to light mode, adjust, click "Save (light)". Enable "Reset on theme change" for automatic application.' },
        { type: 'text', text: 'Listing Preferences:' },
        { type: 'list', items: [
          'Save filters across sessions (off by default) — keeps active filters when closing and reopening the app',
          'Save view mode (on by default) — remembers compact/list/cards choice',
          'Save items per page (off by default) — remembers how many items to show per page',
          'Save current page (off by default) — resumes the last visited page when reopening a listing',
        ]},
      ],
    },

    // ─── SETTINGS — VIEWS ─────────────────────────────────────────────────────
    {
      id: 'settings-views',
      title: 'Settings — Views',
      content: [
        { type: 'text', text: 'The Views tab controls analytics panels for each section and their layout position.' },
        { type: 'text', text: 'Analytics Panels — enable or disable the analytics panel for each module:' },
        { type: 'list', items: [
          'Vehicles — fleet status chart, top mileage and distribution by category',
          'Drivers — availability, active shifts and license categories',
          'Trips — completion rate, total distance and trip status',
          'Fuel — consumption per vehicle and cost trends',
          'Maintenance — costs and intervention status',
          'Expenses — total, payment rate and distribution by category',
        ]},
        { type: 'text', text: 'Panel Layout:' },
        { type: 'list', items: [
          'Vertical — fixed panel to the right of the listing (recommended for wide screens). View mode buttons move to the pagination line in this layout.',
          'Horizontal — panel appears above the listing, useful on narrower screens.',
        ]},
        { type: 'tip', text: 'You can use the search bar in Settings to quickly find "Views" without having to navigate between tabs.' },
      ],
    },
  ],
} as const;
