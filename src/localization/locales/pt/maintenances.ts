// ========================================
// FILE: src/locales/pt/maintenances.ts (ATUALIZADO)
// ========================================
export const ptMaintenances = {
  title: 'Gestão de Manutenções',
  description: 'Gerir manutenções da frota',
  newMaintenance: 'Nova Manutenção',
  noMaintenances: 'Nenhuma manutenção registada',
  searchPlaceholder: 'Pesquisar por veículo ou categoria...',

  tabs: {
    maintenances: 'Manutenções',
    categories: 'Categorias',
    workshops: 'Oficinas',
  },

  stats: {
    total: 'Total',
    scheduled: 'Agendadas',
    inProgress: 'Em Andamento',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
    totalCost: 'Custo Total',
    averageCost: 'Custo Médio',
  },

  status: {
    scheduled: {
      label: 'Agendada',
      description: 'Manutenção agendada',
    },
    in_progress: {
      label: 'Em Andamento',
      description: 'Manutenção a decorrer',
    },
    completed: {
      label: 'Concluída',
      description: 'Manutenção finalizada',
    },
    cancelled: {
      label: 'Cancelada',
      description: 'Manutenção cancelada',
    },
  },

  priority: {
    low: {
      label: 'Baixa',
      description: 'Prioridade baixa',
    },
    normal: {
      label: 'Normal',
      description: 'Prioridade normal',
    },
    high: {
      label: 'Alta',
      description: 'Prioridade alta',
    },
    urgent: {
      label: 'Urgente',
      description: 'Prioridade urgente',
    },
  },

  type: {
    preventive: {
      label: 'Preventiva',
      short: 'Prev.',
      description: 'Manutenção preventiva',
    },
    corrective: {
      label: 'Correctiva',
      short: 'Corr.',
      description: 'Manutenção correctiva',
    },
  },

  fields: {
    vehicle: 'Veículo',
    category: 'Categoria',
    workshop: 'Oficina',
    type: 'Tipo',
    entryDate: 'Data de Entrada',
    exitDate: 'Data de Saída',
    mileage: 'Quilometragem',
    description: 'Descrição',
    diagnosis: 'Diagnóstico',
    solution: 'Solução',
    partsCost: 'Custo de Peças',
    laborCost: 'Custo de Mão de Obra',
    totalCost: 'Custo Total',
    status: 'Estado',
    priority: 'Prioridade',
    workOrderNumber: 'Nº Ordem de Serviço',
    notes: 'Observações',
    nextMaintenanceKm: 'Próxima Manutenção (km)',
    categoryName: 'Nome da Categoria',
    categoryDescription: 'Descrição da Categoria',
    categoryType: 'Tipo de Categoria',
    categoryColor: 'Cor',
  },

  placeholders: {
    vehicle: 'Seleccione o veículo',
    category: 'Seleccione a categoria',
    workshop: 'Seleccione a oficina (opcional)',
    type: 'Seleccione o tipo',
    mileage: 'Ex: 45000',
    description: 'Descreva o problema ou serviço a ser realizado...',
    diagnosis: 'Descreva o diagnóstico inicial...',
    solution: 'Descreva os trabalhos realizados e soluções aplicadas...',
    partsCost: '0.00',
    laborCost: '0.00',
    workOrderNumber: 'Ex: OS-2025-001',
    notes: 'Informações adicionais...',
    categoryName: 'Ex: Troca de Óleo, Revisão de Freios',
    categoryDescription: 'Descrição opcional da categoria...',
    // NOVOS PLACEHOLDERS PARA EDIT
    selectVehicle: 'Seleccione o veículo',
    searchVehicle: 'Pesquisar por matrícula, marca...',
    selectCategory: 'Seleccione a categoria',
    searchCategory: 'Pesquisar por nome...',
    selectWorkshop: 'Seleccione a oficina',
    searchWorkshop: 'Pesquisar por nome ou cidade...',
    selectStatus: 'Seleccione o estado',
    selectPriority: 'Seleccione a prioridade',
    addNotes: 'Adicione notas aqui',
    nextMaintenanceKm: 'Ex: 85000',
  },

  actions: {
    view: 'Ver Detalhes',
    start: 'Iniciar',
    complete: 'Concluir',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    save: 'Guardar',
    create: 'Criar',
    update: 'Actualizar',
    creating: 'A criar...',
    updating: 'A actualizar...',
    starting: 'A iniciar...',
    completing: 'A concluir...',
    deleting: 'A eliminar...',
    schedule: 'Agendar Manutenção',
    startNow: 'Iniciar Manutenção',
    startNowDescription: 'Iniciar manutenção imediatamente (alterar estado do veículo para Em Manutenção)',
    activate: 'Activar',
    activating: 'A activar...',
  },

  dialogs: {
    new: {
      title: 'Registar Manutenção',
      description: 'Preencha os dados da manutenção a ser realizada',
    },
    edit: {  // NOVO
      title: 'Editar Manutenção',
      description: 'Actualize os dados da manutenção seleccionada',
    },
    start: {
      title: 'Iniciar Manutenção',
      description: 'Inicie a manutenção',
    },
    complete: {
      title: 'Concluir Manutenção',
      description: 'Finalize a manutenção',
    },
    view: {
      title: 'Detalhes da Manutenção',
      description: 'Informações completas sobre a manutenção',
      dates: 'Datas',
      costs: 'Custos',
      additionalInfo: 'Informações Adicionais',
      descriptions: 'Descrições',
    },
    delete: {
      title: 'Eliminar Manutenção',
      description: 'Tem a certeza que deseja eliminar a manutenção',
      warning: 'Esta acção não pode ser desfeita.',
    },
    newCategory: {
      title: 'Nova Categoria de Manutenção',
      description: 'Crie uma categoria para organizar as manutenções',
    },
    deleteCategory: {
      title: 'Eliminar Categoria',
      description: 'Tem a certeza que deseja eliminar a categoria',
      warning: 'Esta acção não pode ser desfeita.',
    },
    editCategory: {
      title: 'Editar Categoria',
      description: 'Altere os dados da categoria seleccionada.',
    },
  },

  alerts: {
    noVehicles: 'Nenhum veículo disponível',
    noCategories: 'Nenhuma categoria disponível',
    noWorkshops: 'Nenhuma oficina disponível',
    diagnosisRequired: 'Por favor, adicione um diagnóstico inicial',
    solutionRequired: 'Por favor, descreva a solução aplicada',
    vehicleInMaintenance: 'Manutenção em andamento',
    upcomingOne: '1 veículo aproxima-se da próxima manutenção preventiva',
    upcomingMany: '{{count}} veículos aproximam-se da próxima manutenção preventiva',
    overdue: 'Manutenção em atraso',
    remainingKm: '{{km}} km restantes',
    nextAt: 'próxima aos',
  },

  toast: {
    createSuccess: 'Manutenção registada com sucesso',
    createError: 'Erro ao registar manutenção',
    updateSuccess: 'Manutenção actualizada com sucesso',
    updateError: 'Erro ao actualizar manutenção',
    startSuccess: 'Manutenção iniciada com sucesso',
    startError: 'Erro ao iniciar manutenção',
    completeSuccess: 'Manutenção concluída com sucesso',
    completeError: 'Erro ao concluir manutenção',
    deleteSuccess: 'Manutenção eliminada com sucesso',
    deleteError: 'Erro ao eliminar manutenção',
    categoryCreateSuccess: 'Categoria criada com sucesso',
    categoryCreateError: 'Erro ao criar categoria',
    categoryUpdateSuccess: 'Categoria actualizada com sucesso',
    categoryUpdateError: 'Erro ao actualizar categoria',
    categoryDeleteSuccess: 'Categoria eliminada com sucesso',
    categoryDeleteError: 'Erro ao eliminar categoria',
    categoryRestored: 'Categoria activada com sucesso',
  },

  errors: {
    vehicleOnTrip: 'O veículo está numa viagem em curso — termina a viagem antes de iniciar a manutenção',
    maintenanceNotActive: 'Só é possível concluir uma manutenção agendada ou em curso',
    errorLoading: 'Erro ao carregar manutenções',
    errorLoadingCategories: 'Erro ao carregar categorias',
    maintenanceNotFound: 'Manutenção não encontrada',
    categoryNotFound: 'Categoria não encontrada',
    categoryAlreadyExists: "Já existe uma categoria com o nome '{{name}}'",
    categoryHasMaintenances: 'Esta categoria possui {{count}} manutenç{{plural}} vinculada{{s}}',
    vehicleNotAvailable: 'Veículo não está disponível',
    restoreFailed: 'Erro ao activar categoria',
    requiredField: 'Campo obrigatório: {{field}}',
  },

  warnings: {
    categoryExistsInactive: "A categoria '{{name}}' existe mas está inactiva.",
  },

  validation: {
    vehicleRequired: 'O veículo é obrigatório',
    categoryRequired: 'A categoria é obrigatória',
    typeRequired: 'O tipo é obrigatório',
    descriptionRequired: 'A descrição é obrigatória',
    mileageRequired: 'A quilometragem é obrigatória',
    mileagePositive: 'A quilometragem deve ser maior que zero',
    categoryNameRequired: 'O nome da categoria é obrigatório',
  },

  info: {
    enteredOn: 'Entrada a',
    exitedOn: 'Saída a',
    currentlyInProgress: 'Actualmente em andamento',
    noWorkshop: 'Sem oficina',
    noObservations: 'Sem observações registadas',
    noNotes: 'Sem notas',
    estimatedCost: 'Custo Estimado',
    finalCost: 'Custo Final',
    inProgressCount: '{{count}} em andamento',
    scheduledCount: '{{count}} agendada{{plural}}',
    preventiveCount: '{{count}} preventiva{{plural}}',
    correctiveCount: '{{count}} correctiva{{plural}}',
    auto: 'Auto',
    typeAutoFilled: 'Tipo definido pela categoria seleccionada',
    mileageAutoFilled: 'Quilometragem preenchida automaticamente ({{mileage}} km)',
    nextMaintenanceKmHint: 'Opcional. O sistema avisa quando o veículo se aproximar desta quilometragem.',
  },

  filters: {
    all: 'Todos os estados',
    scheduled: 'Agendadas',
    in_progress: 'Em Andamento',
    completed: 'Concluídas',
    cancelled: 'Canceladas',
    allTypes: 'Todos os tipos',
    allCategories: 'Todas as categorias',
  },

  viewModes: {
    compact: 'Compacto',
    normal: 'Normal',
    cards: 'Cartões',
  },

  categories: {
    title: 'Categorias de Manutenção',
    newCategory: 'Nova Categoria',
    preventive: 'Preventiva',
    corrective: 'Correctiva',
    active: 'Activa',
    inactive: 'Inactiva',
    noDescription: 'Sem descrição',
    colors: {
      red: 'Vermelho',
      orange: 'Laranja',
      green: 'Verde',
      blue: 'Azul',
      purple: 'Roxo',
      pink: 'Rosa',
      gray: 'Cinza',
    },
  },

  // NOVAS SEÇÕES PARA O DIÁLOGO DE EDIÇÃO
  sections: {
    identification: 'Identificação',
    workshop: 'Oficina e Estado',
    schedule: 'Agendamento',
    costs: 'Custos',
    details: 'Detalhes',
  },

  workshops: {
    title: 'Oficinas',
    newWorkshop: 'Nova Oficina',
    noWorkshops: 'Nenhuma oficina registada',
    
    fields: {
      name: 'Nome da Oficina',
      phone: 'Telefone',
      email: 'Email',
      address: 'Endereço',
      city: 'Cidade',
      state: 'Estado/Província',
      specialties: 'Especialidades',
      notes: 'Observações',
    },

    placeholders: {
      name: 'Ex: Oficina Central',
      phone: 'Ex: 923 456 789',
      email: 'Ex: oficina@exemplo.com',
      address: 'Ex: Rua da Missão, 123',
      city: 'Ex: Luanda',
      state: 'Ex: Luanda',
      specialties: 'Ex: Mecânica geral, Eléctrica, Funilaria',
      notes: 'Informações adicionais sobre a oficina...',
      categoryNamePreview: 'Nome da Categoria'
    },

    dialogs: {
      new: {
        title: 'Registar Oficina',
        description: 'Preencha os dados da oficina mecânica',
      },
      edit: {
        title: 'Editar Oficina',
        description: 'Actualize os dados da oficina',
      },
      delete: {
        title: 'Eliminar Oficina',
        description: 'Tem a certeza que deseja eliminar a oficina',
        warning: 'Esta acção não pode ser desfeita.',
      },
    },

    toast: {
      createSuccess: 'Oficina registada com sucesso',
      createError: 'Erro ao registar oficina',
      updateSuccess: 'Oficina actualizada com sucesso',
      updateError: 'Erro ao actualizar oficina',
      deleteSuccess: 'Oficina eliminada com sucesso',
      deleteError: 'Erro ao eliminar oficina',
      restored: 'Oficina activada com sucesso',
    },

    errors: {
      workshopNotFound: 'Oficina não encontrada',
      workshopAlreadyExists: "Já existe uma oficina com o nome '{{name}}'",
      workshopHasMaintenances: 'Esta oficina possui {{count}} manutenç{{plural}} vinculada{{s}}',
      restoreFailed: 'Erro ao activar oficina',
    },

    warnings: {
      workshopExistsInactive: "A oficina '{{name}}' existe mas está inactiva.",
    },

    validation: {
      nameRequired: 'O nome da oficina é obrigatório',
    },

    stats: {
      total: 'Total',
      active: 'Activas',
      inactive: 'Inactivas',
    },

    info: {
      noDescription: 'Sem descrição',
      noSpecialties: 'Sem especialidades definidas',
      activeCount: '{{count}} oficina{{plural}} activa{{plural}}',
    },
  },

  analytics: {
    total:             'Total',
    scheduled:         'Agendadas',
    inProgress:        'Em Andamento',
    totalCost:         'Custo Total',
    statusScheduled:   'Agendada',
    statusInProgress:  'Em Andamento',
    statusCompleted:   'Concluída',
    statusCancelled:   'Cancelada',
    maintenanceStatus: 'Estado das Manutenções',
    costByVehicle:     'Custo por Viatura',
    cost:              'Custo',
  },
} as const;

export default ptMaintenances;