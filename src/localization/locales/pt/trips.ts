// ========================================
// FILE: src/locales/pt/trips.ts
// ========================================
export const ptTrips = {
  title: 'Gestão de Viagens',
  description: 'Gerir viagens e trajectos da frota',
  newTrip: 'Iniciar Viagem',
  noTrips: 'Nenhuma viagem registada',
  searchPlaceholder: 'Pesquisar por código, veículo, motorista, origem ou destino...',

  stats: {
    total: 'Total',
    inProgress: 'Em Andamento',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
    totalDistance: 'Distância Total',
    averageDistance: 'Média por Viagem',
  },

  status: {
    in_progress: {
      label: 'Em Andamento',
      description: 'Viagem actualmente em curso',
    },
    completed: {
      label: 'Concluída',
      description: 'Viagem finalizada com sucesso',
    },
    cancelled: {
      label: 'Cancelada',
      description: 'Viagem cancelada',
    },
  },

  fields: {
    tripCode: 'Código da Viagem',
    vehicle: 'Veículo',
    driver: 'Motorista',
    route: 'Rota',
    origin: 'Origem',
    destination: 'Destino',
    startDate: 'Data/Hora de Início',
    endDate: 'Data/Hora de Conclusão',
    startMileage: 'Quilometragem Inicial',
    endMileage: 'Quilometragem Final',
    distance: 'Distância Percorrida',
    duration: 'Duração',
    purpose: 'Finalidade',
    notes: 'Observações',
    status: 'Estado',
  },

  placeholders: {
    origin: 'Ex: Luanda',
    destination: 'Ex: Benguela',
    purpose: 'Ex: Entrega de mercadorias',
    notes: 'Informações adicionais sobre a viagem...',
    endNotes: 'Registre aqui qualquer informação relevante: condições da estrada, incidentes, gastos extras, etc...',
  },

  actions: {
    actions: 'Mais',
    view: 'Ver Detalhes',
    complete: 'Finalizar Viagem',
    cancel: 'Cancelar Viagem',
    save: 'Guardar',
    start: 'Iniciar Viagem',
    starting: 'A iniciar...',
    completing: 'A finalizar...',
    cancelling: 'A cancelar...',
  },

  dialogs: {
    start: {
      title: 'Iniciar Nova Viagem',
      description: 'Seleccione o veículo e motorista para iniciar uma viagem',
      tripType: 'Tipo de Viagem',
      useRoute: 'Usar rota pré-cadastrada',
      useManual: 'Definir origem/destino manualmente',
      selectRoute: 'Seleccione uma rota cadastrada',
      routeDetails: 'Detalhes da Rota',
      estimatedDistance: 'Distância Estimada',
      estimatedDuration: 'Duração Estimada',
      verifyMileage: 'Verifique o odómetro do veículo antes de partir',
      noVehicles: 'Nenhum veículo disponível',
      noDrivers: 'Nenhum motorista disponível',
      noRoutes: 'Nenhuma rota cadastrada',
    },
    complete: {
      title: 'Finalizar Viagem',
      description: 'Registe a quilometragem final e observações',
      distanceCalculated: 'Distância Percorrida',
    },
    view: {
      title: 'Detalhes da Viagem',
      vehicleAndDriver: 'Veículo e Motorista',
      tripDetails: 'Detalhes da Viagem',
      mileageInfo: 'Quilometragem',
      initialKm: 'KM Inicial',
      finalKm: 'KM Final',
      list: "Lista",
      cards: "Cards"
    },
    cancel: {
      title: 'Cancelar Viagem',
      description: 'Tem a certeza que deseja cancelar a viagem',
      warning: 'Esta acção não pode ser desfeita. O veículo e motorista ficarão disponíveis novamente.',
    },
  },

  alerts: {
    selectRoute: 'Seleccione uma rota',
    selectOriginDestination: 'Informe origem e destino',
    endMileageError: 'A quilometragem final deve ser maior que a inicial',
    tripStarted: 'Viagem iniciada com sucesso',
    tripCompleted: 'Viagem finalizada com sucesso',
    tripCancelled: 'Viagem cancelada com sucesso',
  },

  toast: {
    createSuccess: 'Viagem iniciada com sucesso',
    createError: 'Erro ao iniciar viagem',
    completeSuccess: 'Viagem finalizada com sucesso',
    completeError: 'Erro ao finalizar viagem',
    cancelSuccess: 'Viagem cancelada com sucesso',
    cancelError: 'Erro ao cancelar viagem',
  },

  errors: {
    vehicleInMaintenance: 'O veículo tem uma manutenção em curso — conclui-a antes de iniciar uma viagem',
    errorLoading: 'Erro ao carregar viagens',
    routeNotFound: 'Rota não encontrada',
    originDestinationRequired: 'Origem e destino são obrigatórios',
    endMileageLowerThanStart: 'A quilometragem final deve ser maior que a inicial',
    tripNotFound: 'Viagem não encontrada',
    vehicleNotAvailable: 'Veículo não está disponível',
    driverNotAvailable: 'Motorista não está disponível',
  },

  validation: {
    tripNotInProgress: 'A viagem não está em progresso',
    vehicleRequired: 'O veículo é obrigatório',
    driverRequired: 'O motorista é obrigatório',
    startMileageRequired: 'A quilometragem inicial é obrigatória',
    endMileageRequired: 'A quilometragem final é obrigatória',
    routeOrManualRequired: 'Seleccione uma rota ou informe origem/destino',
  },

  info: {
    auto: 'Auto',
    mileageAutoFilled: 'Quilometragem preenchida automaticamente - ({{mileage}} km)',
    startedAt: 'Iniciada a',
    completedAt: 'Concluída a',
    currentlyInProgress: 'Actualmente em curso',
    kmInitial: 'KM inicial',
    noObservations: 'Sem observações registadas',
    inProgressCount: '{{count}} em andamento',
    completedCount: '{{count}} concluída{{plural}}',
    hours: '{{count}}h',
  },

  filters: {
    all: 'Todos os estados',
    in_progress: 'Em Andamento',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
  },

  tabs: {
    all: 'Todas',
    inProgress: 'Em Andamento',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
    trips: 'Viagens',
    routes: 'Rotas',
  },
  
  table: {
      code: "Código",
      route: "Rota",
      vehicle: "Veículo",
      driver: "Motorista",
      status: "Status",
      actions: "Acções"
  },

  analytics: {
    completionRate:   'Taxa de Conclusão',
    inProgress:       'Em Progresso',
    cancelled:        'Canceladas',
    totalDistance:    'Distância Total',
    tripsStatus:      'Estado das Viagens',
    statusInProgress: 'Em Progresso',
    statusCompleted:  'Concluídas',
    statusCancelled:  'Canceladas',
  },
} as const;

export default ptTrips;