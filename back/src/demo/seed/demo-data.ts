import { Role, RiskStatus } from '@prisma/client';

/**
 * Demo dataset (in Brazilian Portuguese, the product's primary market).
 * All dates are relative to the moment of the reset, so the dashboard always looks current:
 * - `created`: days ago the risk was registered
 * - `review`: days from now until the next review (negative = overdue)
 * - `closed`: days ago the risk was closed (only for CLOSED)
 * - action `due`: days from now (negative = past due); `done`: days ago it was completed
 * - comment `ago`: days ago it was written
 */

export type PersonKey = 'demo' | 'ana' | 'bruno' | 'carla' | 'diego' | 'elisa';
export type CategoryKey =
  'infra' | 'ti' | 'fin' | 'ops' | 'legal' | 'pessoas' | 'forn' | 'amb';

export interface DemoPerson {
  key: PersonKey;
  name: string;
  email: string;
  role: Role;
}

export interface DemoAction {
  text: string;
  to?: PersonKey;
  due?: number;
  done?: number;
}

export interface DemoComment {
  by: PersonKey;
  ago: number;
  text: string;
}

export interface DemoRisk {
  title: string;
  description: string;
  category: CategoryKey;
  owner: PersonKey;
  p: number;
  i: number;
  rp?: number;
  ri?: number;
  status: RiskStatus;
  created: number;
  review?: number;
  closed?: number;
  actions?: DemoAction[];
  comments?: DemoComment[];
}

export const DEMO_ORGANIZATION = { name: 'Nimbus Demo', slug: 'nimbus-demo' };

/** The `demo` person gets its email from DEMO_EMAIL. */
export const DEMO_PEOPLE: DemoPerson[] = [
  { key: 'demo', name: 'Visitante Demo', email: '', role: Role.ADMIN },
  {
    key: 'ana',
    name: 'Ana Souza',
    email: 'ana.souza@nimbus-demo.app',
    role: Role.MANAGER,
  },
  {
    key: 'bruno',
    name: 'Bruno Lima',
    email: 'bruno.lima@nimbus-demo.app',
    role: Role.MANAGER,
  },
  {
    key: 'carla',
    name: 'Carla Mendes',
    email: 'carla.mendes@nimbus-demo.app',
    role: Role.VIEWER,
  },
  {
    key: 'diego',
    name: 'Diego Rocha',
    email: 'diego.rocha@nimbus-demo.app',
    role: Role.VIEWER,
  },
  {
    key: 'elisa',
    name: 'Elisa Prado',
    email: 'elisa.prado@nimbus-demo.app',
    role: Role.VIEWER,
  },
];

export const DEMO_CATEGORIES: {
  key: CategoryKey;
  name: string;
  color: string;
}[] = [
  { key: 'infra', name: 'Infraestrutura', color: '#0ea5e9' },
  { key: 'ti', name: 'TI e Cibersegurança', color: '#8b5cf6' },
  { key: 'fin', name: 'Financeiro', color: '#10b981' },
  { key: 'ops', name: 'Operacional', color: '#f59e0b' },
  { key: 'legal', name: 'Jurídico e Compliance', color: '#64748b' },
  { key: 'pessoas', name: 'Pessoas', color: '#ec4899' },
  { key: 'forn', name: 'Fornecedores', color: '#14b8a6' },
  { key: 'amb', name: 'Ambiental', color: '#84cc16' },
];

const { IDENTIFIED, ANALYZING, MITIGATING, MONITORING, CLOSED } = RiskStatus;

export const DEMO_RISKS: DemoRisk[] = [
  {
    title: 'Queda de energia no prédio',
    description:
      'O prédio depende exclusivamente da concessionária. Quedas acima de 30 minutos interrompem o atendimento e desligam os servidores locais.',
    category: 'infra',
    owner: 'ana',
    p: 4,
    i: 5,
    rp: 2,
    ri: 3,
    status: MITIGATING,
    created: 320,
    review: 12,
    actions: [
      {
        text: 'Instalar gerador a diesel com partida automática',
        to: 'bruno',
        due: -20,
        done: 25,
      },
      {
        text: 'Contratar nobreak de 10 kVA para o rack de servidores',
        to: 'ana',
        due: 15,
      },
      {
        text: 'Testar a transferência automática a cada trimestre',
        to: 'diego',
        due: 45,
      },
    ],
    comments: [
      {
        by: 'ana',
        ago: 300,
        text: 'Orçamento do gerador aprovado pela diretoria.',
      },
      {
        by: 'bruno',
        ago: 24,
        text: 'Gerador instalado. Falta o teste de carga com a operação rodando.',
      },
    ],
  },
  {
    title: 'Ataque de ransomware nos servidores de arquivos',
    description:
      'Criptografia maliciosa dos arquivos compartilhados por invasão via e-mail ou acesso remoto exposto.',
    category: 'ti',
    owner: 'bruno',
    p: 4,
    i: 5,
    rp: 1,
    ri: 4,
    status: MITIGATING,
    created: 280,
    review: 20,
    actions: [
      {
        text: 'Implantar backups imutáveis em nuvem (offsite)',
        to: 'bruno',
        due: -30,
        done: 35,
      },
      { text: 'Exigir MFA em todos os acessos remotos', to: 'bruno', due: 10 },
      {
        text: 'Campanha trimestral de simulação de phishing',
        to: 'elisa',
        due: 30,
      },
    ],
    comments: [
      {
        by: 'bruno',
        ago: 34,
        text: 'Restauração testada: 2 TB recuperados em 3h40.',
      },
      {
        by: 'carla',
        ago: 12,
        text: 'O MFA vai valer também para os fornecedores com VPN?',
      },
      {
        by: 'bruno',
        ago: 11,
        text: 'Sim, a regra vale para qualquer conta com acesso externo.',
      },
    ],
  },
  {
    title: 'Vazamento de dados pessoais de clientes (LGPD)',
    description:
      'Exposição de dados de clientes por falha de controle de acesso ou envio indevido, sujeita a sanções da ANPD.',
    category: 'legal',
    owner: 'ana',
    p: 4,
    i: 5,
    rp: 2,
    ri: 4,
    status: ANALYZING,
    created: 200,
    review: 5,
    actions: [
      {
        text: 'Mapear onde ficam os dados pessoais (data mapping)',
        to: 'ana',
        due: -10,
      },
      { text: 'Nomear o encarregado de dados (DPO)', to: 'ana', due: 20 },
    ],
    comments: [
      {
        by: 'elisa',
        ago: 60,
        text: 'O jurídico pediu prioridade para o mapeamento do CRM.',
      },
    ],
  },
  {
    title: 'Falha no link de internet principal',
    description:
      'Indisponibilidade do único link dedicado deixa o ERP em nuvem e o e-commerce fora do ar.',
    category: 'infra',
    owner: 'bruno',
    p: 4,
    i: 4,
    rp: 2,
    ri: 2,
    status: MONITORING,
    created: 340,
    review: 40,
    actions: [
      {
        text: 'Contratar link redundante de outra operadora',
        to: 'bruno',
        due: -210,
        done: 200,
      },
      {
        text: 'Configurar failover automático no firewall',
        to: 'bruno',
        due: -160,
        done: 150,
      },
    ],
  },
  {
    title: 'Atraso de fornecedor crítico de matéria-prima',
    description:
      'O principal fornecedor de resina responde por 70% do volume e já atrasou entregas duas vezes no ano.',
    category: 'forn',
    owner: 'ana',
    p: 4,
    i: 4,
    rp: 3,
    ri: 3,
    status: MITIGATING,
    created: 150,
    review: 9,
    actions: [
      { text: 'Homologar um segundo fornecedor', to: 'ana', due: 25 },
      { text: 'Manter estoque de segurança de 15 dias', to: 'diego', due: -5 },
    ],
    comments: [
      {
        by: 'diego',
        ago: 8,
        text: 'Estoque atual cobre 9 dias. Pedido extra enviado.',
      },
    ],
  },
  {
    title: 'Variação cambial em contratos dolarizados',
    description:
      'Licenças de software e insumos importados são cotados em dólar, pressionando a margem.',
    category: 'fin',
    owner: 'ana',
    p: 4,
    i: 3,
    rp: 2,
    ri: 3,
    status: MONITORING,
    created: 260,
    review: 30,
    actions: [
      {
        text: 'Contratar hedge cambial para 12 meses',
        to: 'ana',
        due: -185,
        done: 180,
      },
    ],
  },
  {
    title: 'Inadimplência de clientes acima de 8%',
    description:
      'A carteira de clientes do varejo vem atrasando pagamentos desde o último trimestre.',
    category: 'fin',
    owner: 'bruno',
    p: 3,
    i: 4,
    status: IDENTIFIED,
    created: 20,
    review: 14,
  },
  {
    title: 'Acidente de trabalho na área de produção',
    description:
      'Operação de prensas e empilhadeiras com risco de lesões graves e afastamentos.',
    category: 'ops',
    owner: 'ana',
    p: 2,
    i: 5,
    rp: 1,
    ri: 4,
    status: MITIGATING,
    created: 230,
    review: 18,
    actions: [
      { text: 'Reciclagem de NR-12 para os operadores', to: 'elisa', due: -15 },
      { text: 'Inspeção mensal dos EPIs', to: 'diego', due: 7 },
      {
        text: 'Instalar sensores de presença nas prensas',
        to: 'bruno',
        due: -60,
        done: 58,
      },
    ],
  },
  {
    title: 'Incêndio no almoxarifado',
    description: 'Material inflamável armazenado próximo ao quadro elétrico.',
    category: 'infra',
    owner: 'bruno',
    p: 2,
    i: 5,
    rp: 1,
    ri: 5,
    status: MONITORING,
    created: 350,
    review: 60,
    actions: [
      {
        text: 'Revisar o sistema de sprinklers',
        to: 'bruno',
        due: -305,
        done: 300,
      },
      {
        text: 'Treinar a brigada de incêndio',
        to: 'elisa',
        due: -125,
        done: 120,
      },
    ],
  },
  {
    title: 'Saída de profissionais-chave da equipe de TI',
    description:
      'Dois analistas concentram o conhecimento das integrações do ERP.',
    category: 'pessoas',
    owner: 'ana',
    p: 3,
    i: 4,
    rp: 2,
    ri: 3,
    status: ANALYZING,
    created: 90,
    review: 25,
    actions: [
      { text: 'Criar plano de sucessão', to: 'ana', due: 40 },
      { text: 'Documentar as integrações críticas', to: 'bruno', due: 60 },
    ],
  },
  {
    title: 'Multa por descumprimento de norma ambiental',
    description:
      'A licença de operação vence em breve e há condicionantes pendentes.',
    category: 'amb',
    owner: 'ana',
    p: 2,
    i: 4,
    rp: 1,
    ri: 3,
    status: MITIGATING,
    created: 180,
    review: 2,
    actions: [
      {
        text: 'Protocolar a renovação da licença de operação',
        to: 'ana',
        due: -3,
      },
    ],
    comments: [
      {
        by: 'ana',
        ago: 4,
        text: 'Faltam os laudos de efluentes para protocolar.',
      },
    ],
  },
  {
    title: 'Indisponibilidade do ERP após atualização',
    description:
      'Atualizações de versão sem ambiente de homologação já pararam o faturamento por um dia.',
    category: 'ti',
    owner: 'bruno',
    p: 3,
    i: 4,
    rp: 2,
    ri: 2,
    status: CLOSED,
    created: 300,
    closed: 60,
    actions: [
      {
        text: 'Criar ambiente de homologação',
        to: 'bruno',
        due: -100,
        done: 95,
      },
      {
        text: 'Definir janela de manutenção aos domingos',
        to: 'bruno',
        due: -80,
        done: 75,
      },
    ],
  },
  {
    title: 'Fraude em reembolso de despesas',
    description: 'Reembolsos aprovados sem conferência de nota fiscal.',
    category: 'fin',
    owner: 'ana',
    p: 2,
    i: 3,
    rp: 1,
    ri: 2,
    status: CLOSED,
    created: 250,
    closed: 100,
    actions: [
      {
        text: 'Exigir a nota fiscal no sistema de reembolso',
        to: 'ana',
        due: -130,
        done: 120,
      },
    ],
  },
  {
    title: 'Perda de certificação ISO 9001 na auditoria',
    description:
      'Não conformidades abertas da última auditoria interna ainda sem tratativa.',
    category: 'legal',
    owner: 'ana',
    p: 2,
    i: 4,
    rp: 1,
    ri: 3,
    status: MONITORING,
    created: 210,
    review: 20,
    actions: [
      {
        text: 'Fechar as não conformidades da auditoria interna',
        to: 'elisa',
        due: -40,
        done: 42,
      },
    ],
  },
  {
    title: 'Contaminação do solo por descarte irregular',
    description:
      'Óleo usado das máquinas é armazenado em tambores sem bacia de contenção.',
    category: 'amb',
    owner: 'bruno',
    p: 2,
    i: 5,
    status: IDENTIFIED,
    created: 10,
    review: 7,
  },
  {
    title: 'Senhas fracas em sistemas internos',
    description:
      'Auditoria encontrou contas com senhas padrão e sem expiração.',
    category: 'ti',
    owner: 'bruno',
    p: 4,
    i: 3,
    rp: 2,
    ri: 2,
    status: CLOSED,
    created: 270,
    closed: 30,
    actions: [
      {
        text: 'Aplicar política de senhas no Active Directory',
        to: 'bruno',
        due: -50,
        done: 45,
      },
      {
        text: 'Implantar gerenciador de senhas corporativo',
        to: 'bruno',
        due: -35,
        done: 32,
      },
    ],
  },
  {
    title: 'Greve de transportadoras',
    description:
      'Paralisações no transporte rodoviário afetam a entrega aos clientes.',
    category: 'forn',
    owner: 'ana',
    p: 3,
    i: 3,
    rp: 1,
    ri: 3,
    status: MONITORING,
    created: 190,
    review: 45,
  },
  {
    title: 'Falha no ar-condicionado do datacenter',
    description:
      'Um único equipamento atende a sala de servidores. Temperatura acima de 30 °C desliga os servidores.',
    category: 'infra',
    owner: 'bruno',
    p: 3,
    i: 4,
    rp: 2,
    ri: 2,
    status: MITIGATING,
    created: 110,
    review: 3,
    actions: [
      {
        text: 'Instalar um segundo equipamento (redundância N+1)',
        to: 'bruno',
        due: 20,
      },
      {
        text: 'Configurar alerta de temperatura por SMS',
        to: 'bruno',
        due: -25,
        done: 22,
      },
    ],
  },
  {
    title: 'Processo trabalhista por horas extras',
    description: 'Banco de horas sem controle formal no setor de expedição.',
    category: 'legal',
    owner: 'ana',
    p: 3,
    i: 3,
    rp: 2,
    ri: 2,
    status: ANALYZING,
    created: 70,
    review: 15,
  },
  {
    title: 'Alta rotatividade na operação',
    description:
      'Turnover de 6% ao mês na linha de produção eleva os custos de treinamento.',
    category: 'pessoas',
    owner: 'ana',
    p: 4,
    i: 2,
    status: IDENTIFIED,
    created: 35,
    review: 21,
    comments: [
      {
        by: 'carla',
        ago: 30,
        text: 'Sugiro incluir os dados das entrevistas de desligamento.',
      },
    ],
  },
  {
    title: 'Ataque DDoS ao site de vendas',
    description:
      'Ataques de negação de serviço em datas promocionais derrubam o e-commerce.',
    category: 'ti',
    owner: 'bruno',
    p: 2,
    i: 4,
    rp: 1,
    ri: 3,
    status: MONITORING,
    created: 240,
    review: 35,
    actions: [
      {
        text: 'Contratar CDN com proteção anti-DDoS',
        to: 'bruno',
        due: -190,
        done: 185,
      },
    ],
  },
  {
    title: 'Quebra da linha de envase principal',
    description:
      'A linha 1 responde por 60% da produção e não tem peças de reposição em estoque.',
    category: 'ops',
    owner: 'bruno',
    p: 3,
    i: 5,
    rp: 2,
    ri: 4,
    status: MITIGATING,
    created: 130,
    review: 6,
    actions: [
      {
        text: 'Implantar manutenção preditiva com análise de vibração',
        to: 'bruno',
        due: 30,
      },
      {
        text: 'Comprar o kit de peças críticas de reposição',
        to: 'diego',
        due: -12,
        done: 10,
      },
    ],
    comments: [
      {
        by: 'diego',
        ago: 9,
        text: 'Kit de peças recebido e catalogado no almoxarifado.',
      },
    ],
  },
  {
    title: 'Erro de cálculo na folha de pagamento',
    description:
      'Planilhas manuais de adicionais geram erros recorrentes na folha.',
    category: 'pessoas',
    owner: 'ana',
    p: 2,
    i: 3,
    rp: 1,
    ri: 2,
    status: CLOSED,
    created: 330,
    closed: 220,
    actions: [
      {
        text: 'Automatizar os adicionais no sistema de folha',
        to: 'ana',
        due: -240,
        done: 235,
      },
    ],
  },
  {
    title: 'Dependência de fornecedor único de software',
    description:
      'O sistema de logística é mantido por uma empresa pequena sem contrato de continuidade.',
    category: 'forn',
    owner: 'bruno',
    p: 3,
    i: 3,
    status: ANALYZING,
    created: 50,
    review: 10,
  },
  {
    title: 'Enchente no estacionamento e subsolo',
    description:
      'Chuvas fortes já alagaram o subsolo onde ficam os arquivos físicos.',
    category: 'amb',
    owner: 'ana',
    p: 2,
    i: 4,
    rp: 1,
    ri: 2,
    status: MONITORING,
    created: 160,
    review: 50,
    actions: [
      {
        text: 'Mover o arquivo físico para o primeiro andar',
        to: 'elisa',
        due: -100,
        done: 98,
      },
    ],
  },
  {
    title: 'Perda de backup por mídia corrompida',
    description:
      'Fitas de backup antigas falharam no último teste de restauração.',
    category: 'ti',
    owner: 'bruno',
    p: 2,
    i: 5,
    rp: 1,
    ri: 3,
    status: CLOSED,
    created: 290,
    closed: 150,
    actions: [
      {
        text: 'Migrar os backups para armazenamento em nuvem',
        to: 'bruno',
        due: -160,
        done: 155,
      },
    ],
  },
  {
    title: 'Aumento do custo de energia elétrica',
    description:
      'Reajustes tarifários e bandeiras vermelhas elevam o custo de produção.',
    category: 'fin',
    owner: 'ana',
    p: 4,
    i: 2,
    rp: 3,
    ri: 2,
    status: MONITORING,
    created: 120,
    review: 28,
    actions: [
      {
        text: 'Estudar migração para o mercado livre de energia',
        to: 'ana',
        due: 50,
      },
    ],
  },
  {
    title: 'Falta de EPI em estoque',
    description: 'Compras de EPI feitas sem previsão de consumo.',
    category: 'ops',
    owner: 'ana',
    p: 2,
    i: 3,
    rp: 1,
    ri: 2,
    status: CLOSED,
    created: 140,
    closed: 80,
    actions: [
      {
        text: 'Definir estoque mínimo de EPI no sistema de compras',
        to: 'diego',
        due: -90,
        done: 85,
      },
    ],
  },
  {
    title: 'Uso indevido de software sem licença',
    description:
      'Inventário encontrou softwares instalados sem licença em estações de trabalho.',
    category: 'legal',
    owner: 'bruno',
    p: 2,
    i: 2,
    status: IDENTIFIED,
    created: 12,
    review: 16,
  },
  {
    title: 'Falha de comunicação em situações de crise',
    description:
      'Não há plano formal de comunicação com clientes e imprensa em incidentes.',
    category: 'ops',
    owner: 'ana',
    p: 3,
    i: 3,
    rp: 2,
    ri: 2,
    status: ANALYZING,
    created: 60,
    review: 11,
  },
  {
    title: 'Phishing direcionado à diretoria',
    description:
      'E-mails falsos se passando por fornecedores pedem alteração de dados bancários.',
    category: 'ti',
    owner: 'bruno',
    p: 4,
    i: 4,
    rp: 2,
    ri: 3,
    status: MITIGATING,
    created: 45,
    review: 8,
    actions: [
      {
        text: 'Configurar SPF, DKIM e DMARC no domínio',
        to: 'bruno',
        due: -20,
        done: 18,
      },
      {
        text: 'Exigir dupla checagem por telefone para mudança de conta bancária',
        to: 'ana',
        due: 5,
      },
    ],
    comments: [
      {
        by: 'ana',
        ago: 40,
        text: 'Recebemos mais duas tentativas esta semana.',
      },
      {
        by: 'bruno',
        ago: 17,
        text: 'DMARC em modo reject. As tentativas caíram para zero.',
      },
    ],
  },
  {
    title: 'Recall de produto por defeito de qualidade',
    description:
      'Falha no controle de qualidade pode levar a recall e dano à marca.',
    category: 'ops',
    owner: 'ana',
    p: 1,
    i: 5,
    rp: 1,
    ri: 3,
    status: MONITORING,
    created: 310,
    review: 70,
  },
  {
    title: 'Ruptura de contrato com cliente estratégico',
    description:
      'O maior cliente (22% da receita) sinalizou que pode abrir concorrência.',
    category: 'fin',
    owner: 'ana',
    p: 2,
    i: 5,
    status: IDENTIFIED,
    created: 5,
    review: 4,
    comments: [
      {
        by: 'ana',
        ago: 3,
        text: 'Reunião com o comercial marcada para a próxima semana.',
      },
    ],
  },
  {
    title: 'Infiltração no telhado do galpão',
    description: 'Goteiras sobre a área de estoque de produto acabado.',
    category: 'infra',
    owner: 'bruno',
    p: 3,
    i: 2,
    rp: 1,
    ri: 2,
    status: CLOSED,
    created: 200,
    closed: 170,
    actions: [
      {
        text: 'Trocar as telhas e calhas do galpão 2',
        to: 'bruno',
        due: -175,
        done: 172,
      },
    ],
  },
  {
    title: 'Vazamento de produtos químicos',
    description: 'Armazenamento de solventes perto da rede pluvial.',
    category: 'amb',
    owner: 'bruno',
    p: 1,
    i: 4,
    rp: 1,
    ri: 3,
    status: MONITORING,
    created: 260,
    review: 90,
  },
];
