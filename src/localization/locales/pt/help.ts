// ========================================
// FILE: src/locales/pt/help.ts
// ========================================
export const ptHelp = {
  search: { placeholder: 'Pesquisar ajuda...' },
  noResults: 'Nenhum resultado para',
  footer: 'FleetControl · AKM Systems',

  sections: [
    // ─── INTRODUÇÃO ───────────────────────────────────────────────────────────
    {
      id: 'intro',
      title: 'Introdução ao FleetControl',
      content: [
        { type: 'text', text: 'O FleetControl é um sistema de gestão de frotas que permite monitorar veículos, motoristas, viagens, abastecimentos, manutenções, despesas e multas. Inclui rastreamento GPS em tempo real via Traccar.' },
        { type: 'text', text: 'O Desktop liga-se ao servidor FleetControl (chave de licença começa por LK-) e sincroniza os dados automaticamente; continua a funcionar temporariamente sem ligação à internet, sincronizando de novo assim que a ligação voltar.' },
      ],
    },

    // ─── PAINEL INICIAL ───────────────────────────────────────────────────────
    {
      id: 'dashboard',
      title: 'Painel Inicial',
      content: [
        { type: 'text', text: 'O Painel Inicial apresenta um resumo do estado actual da frota com métricas chave e acesso rápido às secções principais.' },
        { type: 'list', items: [
          'Resumo de veículos activos, em manutenção e fora de serviço',
          'Viagens recentes e estatísticas de combustível',
          'Alertas de manutenções pendentes e licenças de motoristas a expirar',
          'Atalhos para as secções mais utilizadas',
        ]},
        { type: 'tip', text: 'Clica nos cartões de resumo para navegar directamente para a secção correspondente.' },
      ],
    },

    // ─── PAINÉIS DE ANÁLISE ───────────────────────────────────────────────────
    {
      id: 'analytics',
      title: 'Painéis de Análise',
      content: [
        { type: 'text', text: 'Cada secção principal (Veículos, Motoristas, Viagens, Combustível, Manutenção, Despesas) tem um painel de análise com KPIs e gráficos. O painel reflecte sempre todos os registos que correspondem aos filtros activos — não apenas os registos visíveis na página actual. Mudar um filtro actualiza imediatamente as análises; a paginação não as afecta.' },
        { type: 'text', text: 'Layout do painel — configurável em Definições › Vistas:' },
        { type: 'list', items: [
          'Vertical (padrão) — painel fixo à direita da listagem, acompanha o scroll. Os botões de modo de visualização (compacto/lista/cartões) movem-se para a linha da paginação neste modo.',
          'Horizontal — painel aparece acima da listagem, ocupa a largura total.',
          'Podes também activar ou desactivar o painel de análise por módulo individualmente.',
        ]},
        { type: 'text', text: 'Explicação das métricas percentuais:' },
        { type: 'table',
          headers: ['Métrica', 'Módulo', 'Como é calculada'],
          rows: [
            ['Taxa de utilização', 'Veículos', 'Veículos em uso ÷ total de veículos activos × 100. Mostra que fracção da frota activa está a ser utilizada neste momento.'],
            ['Disponibilidade', 'Veículos', 'Veículos com estado "disponível" ÷ total de veículos activos × 100. Mostra que fracção da frota activa está livre e pronta para ser atribuída.'],
            ['Taxa de disponibilidade', 'Motoristas', 'Motoristas com estado "disponível" ÷ total de motoristas activos × 100. Mostra quantos dos motoristas activos estão livres neste momento.'],
            ['Taxa de conclusão', 'Viagens', 'Viagens concluídas ÷ total de viagens (no filtro actual) × 100. Mostra a proporção de viagens que chegaram ao destino.'],
            ['Taxa de pagamento', 'Despesas', 'Despesas pagas ÷ total de despesas (no filtro actual) × 100. Mostra que fracção das despesas registadas já foi liquidada.'],
          ],
        },
        { type: 'text', text: 'KPIs e gráficos por módulo:' },
        { type: 'table',
          headers: ['Módulo', 'KPIs', 'Gráficos'],
          rows: [
            ['Veículos', 'Taxa utilização, disponibilidade, média quilometragem, veículos com GPS', 'Donut de estado da frota, barras top quilometragem, barras por categoria'],
            ['Motoristas', 'Taxa disponibilidade, em viagem, de férias, cartas a expirar (30 dias)', 'Donut de disponibilidade, barras por categoria de carta'],
            ['Viagens', 'Taxa de conclusão, em progresso, canceladas, distância total', 'Donut de estado das viagens'],
            ['Combustível', 'Custo total, total litros, preço médio/L, nº abastecimentos', 'Barras de custo por viatura'],
            ['Manutenção', 'Total, agendadas, em andamento, custo total', 'Donut de estado, barras de custo por viatura'],
            ['Despesas', 'Total despesas, valor total, pagas, taxa de pagamento', 'Donut de estado, barras de valor por categoria'],
          ],
        },
        { type: 'tip', text: 'Valores grandes são automaticamente abreviados (ex: 85.300 km → "85.3K km"). Passa o mouse sobre o KPI para ver o valor completo num tooltip com o nome da métrica e o número exacto.' },
      ],
    },

    // ─── VEÍCULOS ─────────────────────────────────────────────────────────────
    {
      id: 'vehicles',
      title: 'Veículos',
      content: [
        { type: 'text', text: 'Gere toda a frota de veículos: regista, edita e consulta o histórico de cada viatura.' },
        { type: 'list', items: [
          'Registo completo: matrícula, marca, modelo, ano, cor, categoria',
          'Número de chassis e estado actual (activo, em manutenção, inactivo)',
          'Quilometragem actual e histórico de actualizações',
          'Histórico de viagens, abastecimentos e manutenções por veículo',
          'Associação ao dispositivo de rastreamento GPS com IMEI',
        ]},
        { type: 'steps', steps: [
          'Clica em "+ Novo Veículo" no canto superior direito',
          'Preenche os dados obrigatórios: matrícula, marca, modelo',
          'Selecciona a categoria e o estado inicial',
          'Guarda o registo',
        ]},
        { type: 'text', text: 'Acções GPS disponíveis por veículo:' },
        { type: 'list', items: [
          'Registar GPS: associa o IMEI ao veículo — após o registo, o sistema sugere adicionar o veículo a uma zona virtual de geofencing',
          'Remover GPS: desvincula o dispositivo; o nome do device no Traccar passa automaticamente a "GPS-XXXXXX" (últimos 6 dígitos do IMEI), indicando que está disponível para reutilização',
          'Para mudar o IMEI: remove o GPS actual e regista o novo — não existe actualização directa de IMEI',
          'Pausar rastreamento: o veículo deixa de aparecer no mapa mas mantém o GPS associado — pode ser reactivado a qualquer momento',
          'Retomar rastreamento: o veículo volta a aparecer no mapa com actualizações em tempo real',
          'Excluir veículo com GPS activo: o sistema avisa que o IMEI será desassociado antes da exclusão e pede confirmação',
        ]},
        { type: 'tip', text: 'O painel "Dispositivos GPS" (botão na barra do mapa) permite filtrar dispositivos com ou sem veículo associado, facilitando a gestão de IMEIs livres.' },
        { type: 'tip', text: 'Quando há filtros activos, aparece um botão "Limpar filtros" que repõe todos os filtros de uma só vez (visível na barra de ferramentas ou na linha da paginação, consoante o layout).' },
        { type: 'text', text: 'As acções de GPS (Registar, Remover, pausar/retomar rastreamento) só aparecem a quem tem a permissão correspondente — consulta O Meu Perfil para veres exactamente o que podes fazer. Um dispositivo já não pode ser associado a dois veículos ao mesmo tempo; o sistema recusa e mostra a que veículo já pertence.' },
        { type: 'warning', text: 'Se um veículo com GPS mostrar o aviso "dispositivo já não responde no Traccar", o servidor deixou de o reconhecer (pode ter sido apagado ou renomeado directamente no Traccar). O sistema não desvincula sozinho — investiga ou remove a associação manualmente.' },
      ],
    },

    // ─── MOTORISTAS ───────────────────────────────────────────────────────────
    {
      id: 'drivers',
      title: 'Motoristas',
      content: [
        { type: 'text', text: 'Cada motorista tem dois estados independentes: o estado contratual e a disponibilidade operacional. É importante perceber qual podes alterar manualmente e qual é gerido automaticamente pelo sistema.' },
        { type: 'text', text: 'Estado Contratual — define a relação laboral do motorista com a empresa:' },
        { type: 'table',
          headers: ['Estado', 'Significado', 'Quem define'],
          rows: [
            ['Activo', 'Motorista em funções na empresa', 'Utilizador'],
            ['De Licença', 'Ausência temporária: férias, baixa médica, etc.', 'Automático (módulo de Licenças) ou utilizador'],
            ['Rescindido', 'Vínculo laboral encerrado — motorista inactivo definitivamente', 'Utilizador'],
          ],
        },
        { type: 'warning', text: 'Não é possível alterar o estado contratual enquanto o motorista tiver uma viagem em curso. Conclui a viagem primeiro.' },
        { type: 'text', text: 'Disponibilidade Operacional — indica se o motorista está pronto para ser atribuído a uma viagem:' },
        { type: 'table',
          headers: ['Disponibilidade', 'Significado', 'Quem define'],
          rows: [
            ['Disponível', 'Pronto para ser atribuído a uma viagem', 'Utilizador ou automático (ao fim de uma viagem ou licença)'],
            ['Em Viagem', 'A conduzir — atribuído a uma viagem activa', 'Automático (módulo de Viagens)'],
            ['Offline', 'Indisponível temporariamente por outra razão', 'Utilizador ou automático (ao iniciar uma licença)'],
          ],
        },
        { type: 'tip', text: 'Ao criar uma viagem, só os motoristas com disponibilidade "Disponível" e estado contratual "Activo" aparecem para selecção.' },
        { type: 'text', text: 'Regras de automatismo:' },
        { type: 'list', items: [
          'Quando uma viagem começa → disponibilidade passa a "Em Viagem" automaticamente',
          'Quando a viagem termina → disponibilidade regressa a "Disponível" automaticamente',
          'Quando uma licença é activada → disponibilidade passa a "Offline" automaticamente',
          'Quando a licença termina → disponibilidade regressa a "Disponível" automaticamente',
          'Não é possível alterar a disponibilidade manualmente enquanto o motorista estiver Em Viagem',
        ]},
      ],
    },

    // ─── VIAGENS ──────────────────────────────────────────────────────────────
    {
      id: 'trips',
      title: 'Viagens',
      content: [
        { type: 'text', text: 'Regista e acompanha todas as viagens da frota: origem, destino, veículo, motorista, quilómetros e custos.' },
        { type: 'list', items: [
          'Veículo e motorista atribuídos',
          'Origem, destino e propósito da viagem',
          'Data/hora de partida e chegada',
          'Quilómetros percorridos (odómetro inicial e final)',
          'Custo da viagem e observações adicionais',
        ]},
        { type: 'steps', steps: [
          'Clica em "+ Nova Viagem"',
          'Selecciona o veículo e o motorista disponível',
          'Define origem, destino e data de partida',
          'Regista o odómetro inicial',
          'Ao terminar, actualiza com data de chegada e odómetro final',
        ]},
        { type: 'tip', text: 'As viagens podem ser correlacionadas com os percursos GPS gravados automaticamente pelo Traccar.' },
        { type: 'tip', text: 'Se dois postos mexerem no mesmo veículo ou motorista ao mesmo tempo (ex. ambos o põem numa viagem), o servidor aceita só a primeira acção. A segunda é recusada por inteiro, com um aviso; os dados são actualizados sozinhos e basta confirmar e tentar de novo. Nunca fica uma viagem gravada com o veículo «disponível».' },
        { type: 'tip', text: 'O estado do veículo e do motorista segue o que está activo: com uma viagem em curso o veículo fica «Em uso»; com uma manutenção em curso fica «Manutenção»; só fica «Disponível» quando não há nenhuma das duas. Por isso não podes mudar à mão o estado de um veículo com viagem ou manutenção aberta, nem iniciar uma manutenção num veículo em viagem — termina ou cancela primeiro.' },
      ],
    },

    // ─── ABASTECIMENTOS ───────────────────────────────────────────────────────
    {
      id: 'fuel',
      title: 'Abastecimentos',
      content: [
        { type: 'text', text: 'Regista todos os abastecimentos de combustível da frota para controlar o consumo e os custos.' },
        { type: 'list', items: [
          'Veículo, data e local do abastecimento',
          'Litros abastecidos, preço por litro e custo total',
          'Leitura do odómetro no momento do abastecimento',
          'Tipo de combustível (gasóleo, gasolina, GLP, elétrico, etc.)',
          'Cálculo automático do consumo médio (km/L)',
        ]},
        { type: 'tip', text: 'Regista sempre o odómetro em cada abastecimento para que o sistema calcule o consumo médio com precisão.' },
      ],
    },

    // ─── MANUTENÇÕES ──────────────────────────────────────────────────────────
    {
      id: 'maintenance',
      title: 'Manutenções',
      content: [
        { type: 'text', text: 'Gere as manutenções preventivas e correctivas de todos os veículos da frota.' },
        { type: 'list', items: [
          'Tipo: preventiva, correctiva',
          'Descrição dos trabalhos realizados, diagnóstico e solução',
          'Fornecedor/oficina, data de entrada e data de saída',
          'Quilómetros do veículo no momento da entrada e quilometragem da próxima manutenção prevista',
          'Custos de peças, mão-de-obra e total',
          'Prioridade: baixa, normal, alta, urgente',
          'Número de ordem de trabalho (opcional)',
        ]},
        { type: 'warning', text: 'Quando um veículo entra em manutenção, o seu estado muda automaticamente. Marca a manutenção como concluída quando os trabalhos terminarem para restituir o veículo ao serviço.' },
        { type: 'tip', text: 'Define a quilometragem da próxima manutenção ao criar ou concluir um registo. O sistema avisa-te automaticamente no topo da página quando o veículo se aproximar desse valor.' },
      ],
    },

    // ─── DESPESAS ─────────────────────────────────────────────────────────────
    {
      id: 'expenses',
      title: 'Despesas',
      content: [
        { type: 'text', text: 'Regista todas as despesas operacionais da frota, por veículo ou de forma geral.' },
        { type: 'list', items: [
          'Categoria de despesa (portagem, lavagem, seguro, inspecção, etc.)',
          'Veículo associado — opcional para despesas gerais da frota',
          'Data, descrição, valor e estado (pendente, pago, cancelado)',
          'Relatórios de despesas por período, veículo ou categoria',
        ]},
        { type: 'tip', text: 'Cria categorias personalizadas em Categorias para melhor organizar as despesas específicas da tua operação.' },
        { type: 'tip', text: 'O painel de análise de Despesas mostra o total, o valor acumulado, a taxa de pagamento e distribuição por categoria (dados da página actual). Podes activá-lo em Definições › Vistas.' },
      ],
    },

    // ─── MULTAS ───────────────────────────────────────────────────────────────
    {
      id: 'fines',
      title: 'Multas',
      content: [
        { type: 'text', text: 'Regista e acompanha as multas de trânsito associadas aos veículos da frota.' },
        { type: 'list', items: [
          'Veículo e motorista associados à infracção',
          'Data, local e tipo de infracção',
          'Valor da coima e prazo de pagamento',
          'Estado do pagamento: pendente, pago, contestado',
          'Responsável pelo pagamento: empresa ou motorista',
        ]},
        { type: 'tip', text: 'Define quem é responsável pelo pagamento (empresa ou motorista) ao registar ou editar a multa. Esse campo aparece no detalhe do registo para facilitar a imputação de custos.' },
      ],
    },

    // ─── LISTAGENS E FILTROS ──────────────────────────────────────────────────
    {
      id: 'listing-preferences',
      title: 'Listagens, Filtros e Visualização',
      content: [
        { type: 'text', text: 'Todas as secções principais partilham o mesmo sistema de listagem com filtros, modos de visualização e paginação.' },
        { type: 'text', text: 'Modos de visualização — disponíveis na barra de ferramentas de cada secção:' },
        { type: 'list', items: [
          'Compacto — linhas densas, mais registos visíveis por ecrã',
          'Lista — linhas standard com mais detalhes por item',
          'Cartões — grelha de cartões com informação visual destacada',
        ]},
        { type: 'tip', text: 'Em modo de análise vertical, os botões de modo de visualização movem-se para a linha da paginação (à esquerda dos controlos de página) para não duplicarem com a barra de ferramentas principal.' },
        { type: 'text', text: 'Filtros e pesquisa:' },
        { type: 'list', items: [
          'Barra de pesquisa por texto livre em tempo real',
          'Filtros por estado, categoria, e outros campos dependendo da secção',
          'Botão "Limpar filtros" — aparece sempre que há filtros activos, na barra de ferramentas (modo vertical) ou na linha da paginação; repõe todos os filtros de uma só vez',
          'Ordenação por coluna clicando no cabeçalho da tabela',
        ]},
        { type: 'text', text: 'Preferências de listagem (Definições › Aparência › Preferências de listagens):' },
        { type: 'table',
          headers: ['Preferência', 'Predefinição', 'O que faz'],
          rows: [
            ['Guardar filtros entre sessões', 'Desligado', 'Mantém os filtros activos ao fechar e reabrir a aplicação'],
            ['Guardar modo de visualização', 'Ligado', 'Mantém a escolha entre compacto/lista/cartões entre sessões'],
            ['Guardar quantidade por página', 'Desligado', 'Lembra quantos itens mostrar por página em cada listagem'],
            ['Guardar página actual', 'Desligado', 'Retoma a última página visitada ao reabrir uma listagem'],
          ],
        },
        { type: 'tip', text: 'Activar "Guardar filtros" é útil quando trabalhas frequentemente com os mesmos filtros (ex: apenas veículos activos ou uma categoria específica).' },
      ],
    },

    // ─── RELATÓRIOS ───────────────────────────────────────────────────────────
    {
      id: 'reports',
      title: 'Relatórios',
      content: [
        { type: 'text', text: 'Gera relatórios detalhados de todos os módulos do sistema, exportáveis em PDF.' },
        { type: 'list', items: [
          'Relatório de viagens por período, veículo ou motorista',
          'Consumo de combustível e custos por veículo',
          'Histórico de manutenções e custos associados',
          'Relatório de despesas por categoria ou período',
          'Resumo geral da frota',
        ]},
        { type: 'text', text: 'O cabeçalho dos PDFs usa as informações configuradas em Definições › Empresa (logótipo, nome, contactos). Em Definições › Relatórios PDF podes personalizar:' },
        { type: 'list', items: [
          'Marca de água (texto ou logótipo da empresa, com opacidade ajustável)',
          'Cores dos cabeçalhos e badges (cor primária e secundária)',
          'Inclusão de gráficos, rodapé e resumo executivo',
          'Tamanho e orientação do papel',
          'Formato dos valores: compacto (K/M) ou números completos',
          'Mostrar ou ocultar o símbolo de moeda (Kz)',
        ]},
        { type: 'tip', text: 'Em modo histórico podes gerar relatórios de bases de dados antigas sem afectar os dados actuais. Consulta a secção "Bases de Dados" para saber como activar este modo.' },
      ],
    },

    // ─── RASTREAMENTO GPS ─────────────────────────────────────────────────────
    {
      id: 'tracking',
      title: 'Rastreamento GPS',
      content: [
        { type: 'text', text: 'O módulo de rastreamento GPS permite monitorar em tempo real a posição de todos os veículos equipados com dispositivo GPS via servidor Traccar.' },
        { type: 'list', items: [
          'Mapa em tempo real com posição de todos os dispositivos',
          'Velocidade, rumo e última actualização de cada veículo',
          'Histórico de percurso por dispositivo e período',
          'Zonas de geofencing com alertas de entrada/saída',
          'Alertas de velocidade excessiva e estado de ignição',
          'Camadas de mapa: ruas, satélite, híbrido, terreno',
        ]},
        { type: 'text', text: 'Zonas de Geofencing — Delimita áreas geográficas no mapa para receber alertas quando um veículo entra ou sai dessas zonas:' },
        { type: 'steps', steps: [
          'Vai ao separador "Zonas" na barra lateral do mapa',
          'Clica em "Círculo" ou "Polígono" e desenha a zona directamente no mapa',
          'Dá um nome à zona e define o limite de velocidade (opcional)',
          'Guarda — a zona é sincronizada com o servidor Traccar',
          'Activa as notificações de entrada/saída em Definições › Alertas GPS',
        ]},
        { type: 'tip', text: 'Usa o botão "Ver todos os dispositivos" na barra de ferramentas para centrar o mapa em toda a frota de uma vez.' },
        { type: 'list', items: [
          'O mapa mostra apenas veículos com GPS activo e rastreamento activado',
          'Veículos com rastreamento pausado aparecem na lista lateral com o badge "Rastreamento pausado" mas não têm marcador no mapa',
          'O painel "Dispositivos GPS" (botão na barra de ferramentas) lista todos os dispositivos Traccar com pesquisa por nome, IMEI ou matrícula',
          'Após restauro de backup, a app verifica automaticamente os IMEIs e avisa quando algum não tem correspondência no Traccar',
        ]},
      ],
    },

    // ─── NOTIFICAÇÕES GPS ─────────────────────────────────────────────────────
    {
      id: 'notifications',
      title: 'Notificações GPS',
      content: [
        { type: 'text', text: 'O FleetControl usa dois tipos de notificação para alertas GPS:' },
        { type: 'list', items: [
          'Notificações internas (toast) — aparecem dentro da aplicação quando está em foco',
          'Notificações nativas do SO — aparecem no sistema operativo quando a aplicação está minimizada ou em segundo plano',
        ]},
        { type: 'table',
          headers: ['Estado da aplicação', 'Tipo de notificação'],
          rows: [
            ['Em foco (janela activa)', 'Notificação interna (toast) no canto do ecrã'],
            ['Minimizada ou em segundo plano', 'Notificação nativa do sistema operativo'],
          ],
        },
        { type: 'tip', text: 'Activa/desactiva as notificações nativas em Definições › Alertas GPS. Cada tipo de evento pode ser configurado individualmente, incluindo um intervalo mínimo (cooldown) entre notificações do mesmo tipo.' },
        { type: 'text', text: 'Painel de Alertas — Clica em "Alertas" na barra de ferramentas do mapa para aceder ao historial. O painel inclui:' },
        { type: 'list', items: [
          'Pesquisa por nome de dispositivo, tipo de evento ou nome de zona',
          'Separadores: Todos / Não lidos / Lidos — com contagem em cada separador',
          'Barra de estatísticas: total não lidos, lidos e período coberto',
          'Clicar num alerta abre o detalhe com coordenadas, data/hora e opção de centrar no mapa',
          'Marcar alertas individualmente ou todos como lidos com um clique',
        ]},
        { type: 'text', text: 'Tipos de evento configuráveis em Definições › Alertas GPS:' },
        { type: 'list', items: [
          'Entrada em zona — veículo entra numa zona de geofencing',
          'Saída de zona — veículo sai de uma zona de geofencing',
          'Velocidade excessiva — veículo ultrapassa o limite definido',
          'Ignição ligada — motor arranca',
          'Ignição desligada — motor pára',
        ]},
      ],
    },

    // ─── BASES DE DADOS ───────────────────────────────────────────────────────
    {
      id: 'databases',
      title: 'Bases de Dados (Modo Histórico)',
      content: [
        { type: 'text', text: 'O sistema guarda automaticamente cópias de segurança da base de dados. A aba "Bases de Dados" em Definições permite activar temporariamente uma base antiga para consultar registos históricos e gerar relatórios.' },
        { type: 'text', text: 'Quando activas uma base de dados histórica:' },
        { type: 'list', items: [
          'Uma barra laranja aparece no topo de todas as páginas indicando que estás em modo histórico',
          'Todas as listagens (veículos, viagens, motoristas, etc.) mostram os dados daquela base',
          'Podes gerar relatórios dos dados históricos normalmente',
          'Não é possível adicionar, editar ou apagar dados — modo somente leitura',
        ]},
        { type: 'steps', steps: [
          'Vai a Definições › Bases de Dados',
          'Clica numa base de dados da lista para expandir os seus detalhes',
          'Clica em "Activar" para entrar em modo histórico',
          'Navega para qualquer secção ou Relatórios para consultar os dados históricos',
          'Clica "Desactivar" na barra laranja no topo do ecrã para voltar à base de dados actual',
        ]},
        { type: 'warning', text: 'Em modo histórico não é possível fazer alterações aos dados. Desactiva o modo histórico para voltar a trabalhar normalmente.' },
      ],
    },

    // ─── GESTÃO DE BASE DE DADOS ──────────────────────────────────────────────
    {
      id: 'db-management',
      title: 'Gestão de Base de Dados',
      content: [
        { type: 'text', text: 'O FleetControl guarda todos os dados localmente num ficheiro SQLite. Com o uso contínuo, esse ficheiro vai crescendo. A zona do programador em Definições › Bases de Dados oferece três modos de gestão para controlar o tamanho da base de dados:' },
        { type: 'table',
          headers: ['Modo', 'O que faz'],
          rows: [
            ['Desativado', 'Nenhuma gestão automática. O sistema apenas alerta quando a base de dados exceder 150 MB. O programador elimina dados manualmente quando necessário.'],
            ['Rotacionamento', 'Quando a base de dados atinge o limite de tamanho ou idade configurado, o sistema cria automaticamente uma nova base de dados, arquiva a actual e copia os dados mais recentes para a nova.'],
            ['Retenção', 'Em vez de criar uma nova base, o sistema apaga directamente os registos mais antigos das tabelas transacionais (viagens, despesas, etc.) com base num período de retenção definido por tabela.'],
          ],
        },
        { type: 'text', text: 'Rotacionamento — como funciona:' },
        { type: 'list', items: [
          'O sistema verifica duas condições: tamanho do ficheiro (MB) e idade da base (dias)',
          'Quando qualquer das condições é atingida, a rotação ocorre automaticamente no próximo arranque — ou pode ser forçada manualmente',
          'A base antiga é arquivada (não apagada) e fica acessível em modo histórico',
          'Os dados mais recentes (configurável em "dias a copiar") são copiados para a nova base: tabelas mestras (veículos, motoristas, rotas, etc.) são copiadas na totalidade; tabelas transacionais (viagens, despesas, etc.) apenas os registos dentro do período configurado',
          'A licença e todas as configurações do sistema são preservadas na nova base',
        ]},
        { type: 'text', text: 'Retenção — como funciona:' },
        { type: 'list', items: [
          'Selecciona quais tabelas transacionais são geridas e define um período de retenção para cada uma (ex: manter últimos 60 dias de viagens)',
          'Ao clicar "Aplicar Retenção Agora", os registos mais antigos do que o período são apagados permanentemente da base de dados activa',
          'Tabelas mestras (veículos, motoristas, etc.) nunca são afectadas — só dados transacionais',
          'A base de dados permanece uma só — não são criadas novas bases',
        ]},
        { type: 'warning', text: 'Tanto o rotacionamento forçado como a aplicação de retenção são operações irreversíveis. Cria sempre um backup antes de executar qualquer uma destas acções.' },
        { type: 'tip', text: 'O modo Rotacionamento é ideal para sistemas em uso contínuo durante anos: cria um histórico organizado por períodos. O modo Retenção é ideal se queres manter a base de dados pequena sem acumular ficheiros históricos.' },
        { type: 'tip', text: 'Para restaurar um backup ou aceder à zona do programador, abre Definições › Bases de Dados e introduz o PIN de programador. A sessão de desbloqueio dura até fechar a aplicação.' },
      ],
    },

    // ─── PERFIL ───────────────────────────────────────────────────────────────
    {
      id: 'profile',
      title: 'O Meu Perfil',
      content: [
        { type: 'text', text: 'Acede ao teu perfil através do avatar/menu de utilizador, no canto superior direito, opção "Perfil". Podes actualizar o teu nome, email e fotografia.' },
        { type: 'text', text: 'A secção "Acesso" mostra, para cada Scope a que pertences (Organização inteira ou um conjunto específico de veículos/motoristas), exactamente que permissões tens nesse Scope — para saberes de imediato o que podes ou não fazer no sistema, sem teres de tentar e descobrir pelo erro.' },
        { type: 'list', items: [
          'Cada permissão aparece no formato recurso:acção (ex: vehicle:read, vehicle:link-device) — o mesmo código que o sistema usa internamente para decidir o que autorizar',
          'Um Scope "Organização inteira" dá-te essa permissão em toda a frota; um Scope de "Recursos específicos" só nos veículos/motoristas incluídos nesse Scope',
          'Se não vires nenhuma permissão para uma acção (ex: GPS, edição de veículos), os botões correspondentes ficam desactivados (ou escondidos) nas telas relevantes, e se tentares a acção ela é recusada logo, com um aviso vermelho, sem chegar a ser gravada — não é um erro, é o teu acesso actual',
        ]},
        { type: 'tip', text: 'Esta lista é só para consulta — quem decide mesmo se uma acção é permitida é sempre o servidor, em cada pedido. Se algo parecer errado, contacta um Administrador da tua organização para rever o teu Scope/permissões.' },
      ],
    },

    // ─── LICENÇA ──────────────────────────────────────────────────────────────
    {
      id: 'license',
      title: 'Licença e Activação',
      content: [
        { type: 'text', text: 'O FleetControl é activado através de uma chave de licença fornecida pela AKM Systems (começa por LK-), ligada à Organization do cliente — servidor, rastreamento GPS em tempo real e multi-utilizador.' },
        { type: 'steps', steps: [
          'No primeiro arranque (ou em Definições › Licença › "Reactivar")',
          'Cola o código curto fornecido pela AKM Systems, no formato LK-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
          'Clica em "Activar Sistema"',
          'O sistema fica operacional de imediato',
        ]},
        { type: 'tip', text: 'Se em vez do código curto recebeste um ficheiro de licença (.txt) com uma linha que começa por "FULL:", clica em "Tenho uma chave completa (avançado)" no ecrã de activação para colar essa chave longa em alternativa.' },
        { type: 'warning', text: 'Guarda a tua chave de licença em local seguro. Em caso de perda, contacta a AKM Systems para assistência.' },
        { type: 'tip', text: 'A chave conectada (LK-) está vinculada à tua organização no servidor. Podes usar a mesma chave para activar o FleetControl noutro computador.' },
        { type: 'text', text: 'Modo conectado sem ligação à Internet:' },
        { type: 'list', items: [
          'Se a app perder a ligação, continua a funcionar com a última sessão válida — aparece uma barra no topo a indicar que estás offline',
          'Enquanto offline, o teu papel e permissões apresentados são os últimos conhecidos, não uma verificação em tempo real',
          'Se a sessão guardada expirar sem que voltes a ligar-te, é necessário iniciar sessão novamente assim que houver Internet',
          'Se vires a mensagem "Sessão terminada", um administrador encerrou a tua sessão remotamente — inicia sessão novamente',
        ]},
        { type: 'tip', text: 'Ao reconectar, a aplicação renova a sessão automaticamente em segundo plano — não precisas de fazer nada. Alterações que um administrador tenha feito ao teu acesso (ex: mudança de papel) só se reflectem depois de reconectares.' },
      ],
    },

    // ─── DEFINIÇÕES ───────────────────────────────────────────────────────────
    {
      id: 'settings',
      title: 'Definições — Visão Geral',
      content: [
        { type: 'text', text: 'Acede às Definições através do botão de engrenagem no canto superior direito do painel. Existe uma barra de pesquisa no topo do diálogo de definições para encontrar qualquer opção rapidamente.' },
        { type: 'tip', text: 'Para alterar o idioma da interface, clica no ícone de bandeira na barra superior (junto ao botão de ajuda). Aparece um menu com os idiomas disponíveis.' },
        { type: 'table',
          headers: ['Separador', 'O que configuras'],
          rows: [
            ['Aparência', 'Tema (claro/escuro), família tipográfica, tamanho de texto, espaçamento do layout, compressão do sidebar, painel de fundo, preferências de listagens'],
            ['Vistas', 'Painéis de análise por secção (on/off) e posição (vertical/horizontal)'],
            ['Empresa', 'Nome, logótipo, NIF, telefone, email, morada e moeda da empresa'],
            ['Relatórios PDF', 'Cabeçalho, cores, marca de água, gráficos, formato e orientação dos PDFs exportados'],
            ['Alertas GPS', 'Que eventos GPS (geofencing, velocidade, ignição) geram alertas e cooldown entre notificações do mesmo tipo'],
            ['Cópias de Segurança', 'Localização e frequência das cópias automáticas da base de dados'],
            ['Bases de Dados', 'Listar e activar bases de dados históricas para consulta'],
            ['Servidor', 'Configurações de ligação à API do FleetControl'],
            ['Sincronização', 'Estado da sincronização automática (PowerSync) e som/notificações de sincronização'],
            ['Licença', 'Informação sobre a licença activa, utilizadores/sessões (seats) e expiração'],
            ['Sobre', 'Versão da aplicação e informações técnicas'],
          ],
        },
      ],
    },

    // ─── DEFINIÇÕES — APARÊNCIA ───────────────────────────────────────────────
    {
      id: 'settings-appearance',
      title: 'Definições — Aparência',
      content: [
        { type: 'text', text: 'O separador Aparência concentra todas as opções visuais da interface.' },
        { type: 'text', text: 'Tema:' },
        { type: 'list', items: [
          'Alterna entre Modo Claro e Modo Escuro com o botão de lua/sol',
          'O tema é aplicado imediatamente a toda a interface',
        ]},
        { type: 'text', text: 'Tipografia:' },
        { type: 'list', items: [
          'Família tipográfica — escolhe entre as fontes disponíveis (ex: Geist, Inter, etc.)',
          'Tamanho de texto — ajusta o tamanho base da interface (afecta todos os textos proporcionalmente)',
        ]},
        { type: 'text', text: 'Layout:' },
        { type: 'list', items: [
          'Espaçamento — adiciona padding interior às páginas para uma leitura mais arejada',
          'Sidebar compacta — reduz a largura do menu lateral para libertar espaço no conteúdo',
          'Auto-colapso da sidebar — colapsa automaticamente a sidebar ao navegar para uma secção',
        ]},
        { type: 'text', text: 'Painel de Fundo — controla o painel de vidro translúcido da interface:' },
        { type: 'list', items: [
          'Opacidade — de 40% (transparente) a 100% (sólido)',
          'Desfoque — de 0px (sem desfoque) a 40px (desfoque máximo)',
          'O botão "Repor" adapta-se ao tema activo: mostra apenas "Modo escuro" (predefinição: 95% / 15px) ou "Modo claro" (predefinição: 48% / 13px)',
          '"Guardar como predefinição" — o botão aparece automaticamente quando mexes num dos controlos nesta sessão; ao guardar, os valores ficam como predefinição para o tema activo',
          'O botão de guardar anima-se com um checkmark verde ao confirmar o guardado, e desaparece suavemente',
          '"Repor ao mudar tema" — toggle que aplica automaticamente a predefinição do novo tema sempre que mudas entre claro e escuro',
        ]},
        { type: 'tip', text: 'Para ter valores diferentes nos dois temas: muda para o tema escuro, ajusta os controlos, clica "Guardar (escuro)"; depois muda para o tema claro, ajusta, clica "Guardar (claro)". Activa "Repor ao mudar tema" para aplicação automática.' },
        { type: 'text', text: 'Preferências de Listagens:' },
        { type: 'list', items: [
          'Guardar filtros entre sessões (desligado por padrão) — mantém os filtros activos ao fechar e reabrir',
          'Guardar modo de visualização (ligado por padrão) — lembra a escolha compacto/lista/cartões',
          'Guardar quantidade por página (desligado por padrão) — lembra quantos itens mostrar por página',
          'Guardar página actual (desligado por padrão) — retoma a última página visitada ao reabrir uma listagem',
        ]},
      ],
    },

    // ─── DEFINIÇÕES — VISTAS ──────────────────────────────────────────────────
    {
      id: 'settings-views',
      title: 'Definições — Vistas',
      content: [
        { type: 'text', text: 'O separador Vistas controla os painéis de análise de cada secção e o seu posicionamento.' },
        { type: 'text', text: 'Painéis de Análise — activa ou desactiva o painel de análise para cada módulo:' },
        { type: 'list', items: [
          'Veículos — gráfico de estado da frota, top quilometragem e distribuição por categoria',
          'Motoristas — disponibilidade, turnos activos e categorias de carta',
          'Viagens — taxa de conclusão, distância total e estado das viagens',
          'Combustível — consumo por veículo e evolução de custos',
          'Manutenção — custos e estado das intervenções',
          'Despesas — total, taxa de pagamento e distribuição por categoria',
        ]},
        { type: 'text', text: 'Layout dos Painéis:' },
        { type: 'list', items: [
          'Vertical — painel fixo à direita da listagem (recomendado para ecrãs largos). Os botões de modo de visualização movem-se para a linha da paginação neste layout.',
          'Horizontal — painel aparece acima da listagem, útil em ecrãs mais estreitos.',
        ]},
        { type: 'tip', text: 'Podes usar a pesquisa nas Definições para encontrar rapidamente "Vistas" sem precisar de navegar pelos separadores.' },
      ],
    },
  ],
} as const;
