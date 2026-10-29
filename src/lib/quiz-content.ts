// Conteúdo do quiz — Growth Intelligence Challenge
// Conteúdo revisado e gabaritos definidos.
// Versão v1 — não alterar sem bumpar contentVersion.

export interface QuizAlternative {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  phase: number
  title: string
  subtitle: string
  scenario: string
  comparison?: { headers: string[]; rows: string[][] }
  alternatives: QuizAlternative[]
  correctId: string
  explanation: string
  reference: string
}

export interface SimulatorOption {
  id: string
  label: string
  description: string
}

export interface SimulatorPhase {
  id: string
  phase: number
  title: string
  subtitle: string
  scenario: string
  customerProfile: string
  options: {
    audience: SimulatorOption[]
    offer: SimulatorOption[]
    channel: SimulatorOption[]
    metric: SimulatorOption[]
  }
  validCombinations: {
    audience: string
    offer: string
    channel: string
    metric: string
  }[]
  feedbackPartial: string
  feedbackCorrect: string
  reference: string
}

// ============================================================
// FASES 1-4: PERGUNTAS DE GROWTH
// ============================================================

export const quizQuestions: QuizQuestion[] = [
  // FASE 1 — Objetivo da campanha
  {
    id: 'q1',
    phase: 1,
    title: 'Objetivo da Campanha',
    subtitle: 'Aquisição • Engajamento • Monetização',
    scenario:
      'Uma empresa de cartões quer aumentar o número de clientes ativos usando a base de cartões emitidos. ' +
      'O foco principal é trazer clientes que ainda não realizam transações para começar a usar o cartão. ' +
      'Qual é o objetivo de Growth mais adequado para essa iniciativa?',
    alternatives: [
      { id: 'a', text: 'Monetização — maximizar o ticket médio dos clientes que já transacionam' },
      { id: 'b', text: 'Aquisição — ativar clientes inativos para que comecem a usar o cartão' },
      { id: 'c', text: 'Engajamento — aumentar a frequência de uso dos clientes já ativos' },
      { id: 'd', text: 'Retenção — reduzir o cancelamento de cartões emitidos' },
    ],
    correctId: 'b',
    explanation:
      'O cenário descreve clientes inativos que precisam ser ativados. O objetivo de Aquisição busca trazer novos usuários ' +
      'ou reativar inativos para que comecem a usar o produto. Monetização foca em clientes que já transacionam, ' +
      'engajamento em frequência de uso e retenção em reduzir churn.',
    reference: 'Conceito de funil de Growth: Aquisição (topo) → Engajamento (meio) → Monetização (fundo) → Retenção.',
  },

  // FASE 2 — Métrica de sucesso
  {
    id: 'q2',
    phase: 2,
    title: 'Métrica de Sucesso',
    subtitle: 'Indicadores de Growth',
    scenario:
      'O time lançou uma campanha de aquisição com pushes no app para clientes inativos. ' +
      'O objetivo é que esses clientes façam a primeira transação. ' +
      'Qual métrica melhor reflete o sucesso dessa campanha?',
    alternatives: [
      { id: 'a', text: 'Taxa de cliques no push (CTR)' },
      { id: 'b', text: 'Número de impressões do push' },
      { id: 'c', text: 'Taxa de conversão para primeira transação' },
      { id: 'd', text: 'Tempo médio de leitura do push' },
    ],
    correctId: 'c',
    explanation:
      'O objetivo é que o cliente faça a primeira transação. CTR mede cliques, não conversão real. ' +
      'Impressões medem alcance, não resultado. A taxa de conversão para primeira transação ' +
      'é a métrica que reflete diretamente o objetivo de aquisição.',
    reference: 'Métricas de Growth: vanity metrics (impressões, cliques) vs actionable metrics (conversão, retenção).',
  },

  // FASE 3 — Leitura de resultados
  {
    id: 'q3',
    phase: 3,
    title: 'Leitura de Resultados',
    subtitle: 'Comparação de campanhas',
    scenario:
      'Duas campanhas tiveram os seguintes resultados:\n' +
      '• Campanha A: 10.000 cliques, 200 conversões (2% de conversão).\n' +
      '• Campanha B: 3.000 cliques, 180 conversões (6% de conversão).\n' +
      'Qual interpretação está correta?',
    alternatives: [
      { id: 'a', text: 'A campanha A é melhor porque teve mais cliques totais' },
      { id: 'b', text: 'A campanha B é melhor porque teve maior taxa de conversão' },
      { id: 'c', text: 'As duas campanhas são equivalentes porque as conversões são parecidas' },
      { id: 'd', text: 'Não é possível comparar porque faltam dados de receita' },
    ],
    correctId: 'b',
    explanation:
      'A campanha B obteve maior taxa de conversão (6% vs 2%), o que indica maior eficiência. ' +
      'Mais cliques não significa melhor resultado se a conversão é baixa. ' +
      'A confusão entre clique e conversão é um erro comum em Growth.',
    reference: 'Diferença entre métricas de clique (CTR) e métricas de conversão (CR).',
  },

  // FASE 4 — Próximo passo
  {
    id: 'q4',
    phase: 4,
    title: 'Próximo Passo',
    subtitle: 'Experimentação e otimização',
    scenario:
      'Uma campanha de engajamento com push no app resultou em um lift de 15% na frequência de uso, ' +
      'com intervalo de confiança de 95%. O custo foi baixo e os clientes não reportaram fadiga. ' +
      'Qual é o próximo passo mais fundamentado pelas evidências?',
    alternatives: [
      { id: 'a', text: 'Suspender a campanha e tentar uma abordagem completamente diferente' },
      { id: 'b', text: 'Escalar a campanha para toda a base, pois o resultado foi positivo' },
      { id: 'c', text: 'Iterar: expandir gradualmente, monitorar fadiga e testar variações' },
      { id: 'd', text: 'Manter exatamente o mesmo formato, pois não há nada a melhorar' },
    ],
    correctId: 'c',
    explanation:
      'Com um lift positivo e estatisticamente significativo, o passo sustentado é iterar: ' +
      'expandir gradualmente, monitorar sinais de fadiga e testar variações para otimizar. ' +
      'Escalar para toda a base sem cuidado pode causar fadiga. Suspender ignoraria evidências positivas. ' +
      'Manter sem iterar perde oportunidades de otimização.',
    reference: 'Ciclo de experimentação: medir → analisar → iterar → escalar.',
  },
]

// ============================================================
// FASE 5 — SIMULADOR DE ENGAJAMENTO
// ============================================================

export const simulatorEngagement: SimulatorPhase = {
  id: 's1',
  phase: 5,
  title: 'Simulador de Engajamento',
  subtitle: 'Monte uma campanha coerente',
  scenario:
    'Cliente com cartão ativo, mas com baixo uso nas últimas 4 semanas. ' +
    'Já fez transações antes, mas parou de usar. ' +
    'Interessado em conhecer os benefícios disponíveis do cartão. ' +
    'Tem preferência por comunicação no app.',
  customerProfile:
    'Cartão Gold ativo • Baixo uso recente • Interesse em benefícios • Prefere comunicação no app',
  options: {
    audience: [
      { id: 'a1', label: 'Todos os clientes ativos', description: 'Segmentação ampla, sem filtro' },
      { id: 'a2', label: 'Clientes com baixo uso recente', description: 'Filtro por frequência de uso' },
      { id: 'a3', label: 'Clientes que nunca transacionaram', description: 'Base inativa total' },
      { id: 'a4', label: 'Clientes cancelados', description: 'Cartões cancelados' },
    ],
    offer: [
      { id: 'o1', label: 'Cashback em categorias do dia', description: 'Oferta personalizada por categoria' },
      { id: 'o2', label: 'Desconto em anuidade', description: 'Redução de anuidade por uso' },
      { id: 'o3', label: 'Empréstimo pré-aprovado', description: 'Oferta de crédito' },
      { id: 'o4', label: 'Lembrete de benefícios disponíveis', description: 'Comunicação educativa sobre benefícios' },
    ],
    channel: [
      { id: 'c1', label: 'Push no app', description: 'Notificação no aplicativo' },
      { id: 'c2', label: 'Ligação telefônica', description: 'Call center ativo' },
      { id: 'c3', label: 'E-mail marketing', description: 'E-mail corporativo' },
      { id: 'c4', label: 'Outdoor', description: 'Mídia exterior' },
    ],
    metric: [
      { id: 'm1', label: 'Taxa de conversão para transação', description: '% que faz nova transação' },
      { id: 'm2', label: 'Impressões da campanha', description: 'Quantas vezes foi vista' },
      { id: 'm3', label: 'Cliques no push', description: 'CTR da notificação' },
      { id: 'm4', label: 'Receita total da empresa', description: 'Receita agregada' },
    ],
  },
  validCombinations: [
    { audience: 'a2', offer: 'o4', channel: 'c1', metric: 'm1' },
    { audience: 'a2', offer: 'o1', channel: 'c1', metric: 'm1' },
    { audience: 'a2', offer: 'o2', channel: 'c3', metric: 'm1' },
  ],
  feedbackPartial:
    'Sua campanha tem pontos coerentes, mas alguns componentes não se encaixam. ' +
    'Revise público, oferta, canal e métrica.',
  feedbackCorrect:
    'Campanha coerente! Você segmentou clientes com baixo uso, ofereceu algo relevante, ' +
    'usou o canal preferido do cliente e mediu o resultado correto.',
  reference:
    'Engajamento: foco em reativar uso através de benefícios relevantes, comunicação no canal preferido e mensuração de conversão real.',
}

// ============================================================
// FASE 6 — SIMULADOR DE MONETIZAÇÃO RESPONSÁVEL
// ============================================================

export const simulatorMonetization: SimulatorPhase = {
  id: 's2',
  phase: 6,
  title: 'Simulador de Monetização Responsável',
  subtitle: 'Monetização sem pressão indevida',
  scenario:
    'Cliente interessado em conhecer uma opção de parcelamento para uma compra planejada. ' +
    'Tem histórico de pagamento em dia e bom relacionamento com a conta. ' +
    'Condições fictícias explícitas: parcelamento em 12x com taxa de 2,99% a.m. ' +
    'e opção de quitação antecipada sem taxa adicional.',
  customerProfile:
    'Bom histórico de pagamento • Interesse em parcelamento • Compra planejada • Condições transparentes',
  options: {
    audience: [
      { id: 'a1', label: 'Clientes com bom histórico de pagamento', description: 'Risco controlado' },
      { id: 'a2', label: 'Todos os clientes independentemente do histórico', description: 'Sem filtro de risco' },
      { id: 'a3', label: 'Clientes já inadimplentes', description: 'Risco elevado' },
      { id: 'a4', label: 'Clientes com restrição de crédito ativa', description: 'Restrição ativa' },
    ],
    offer: [
      { id: 'o1', label: 'Parcelamento transparente com condições claras', description: '12x a 2,99% a.m., quitação antecipada sem taxa' },
      { id: 'o2', label: 'Empréstimo de alto valor sem análise', description: 'Valor alto, sem checagem' },
      { id: 'o3', label: 'Aumento de limite indiscriminado', description: 'Sem critério' },
      { id: 'o4', label: 'Oferta de crédito para quem não solicitou', description: 'Crédito não solicitado' },
    ],
    channel: [
      { id: 'c1', label: 'Comunicação no app com termos claros', description: 'Canal preferido, transparente' },
      { id: 'c2', label: 'Telemarketing pressionando', description: 'Pressão por ligação' },
      { id: 'c3', label: 'SMS com link de termos', description: 'SMS com documento' },
      { id: 'c4', label: 'Nenhuma comunicação de termos', description: 'Sem transparência' },
    ],
    metric: [
      { id: 'm1', label: 'Taxa de conversão para parcelamento', description: '% que aderem ao parcelamento' },
      { id: 'm2', label: 'Valor total endividado', description: 'Endividamento agregado' },
      { id: 'm3', label: 'Impressões', description: 'Alcance da campanha' },
      { id: 'm4', label: 'Taxa de inadimplência gerada', description: '% que ficam inadimplentes' },
    ],
  },
  validCombinations: [
    { audience: 'a1', offer: 'o1', channel: 'c1', metric: 'm1' },
    { audience: 'a1', offer: 'o1', channel: 'c3', metric: 'm1' },
  ],
  feedbackPartial:
    'Alguns componentes da campanha não estão alinhados com monetização responsável. ' +
    'Revise se o público, a oferta, o canal e a métrica respeitam a transparência e a adequação ao perfil.',
  feedbackCorrect:
    'Excelente! Você selecionou um público adequado, uma oferta transparente, ' +
    'um canal que preserva a clareza e uma métrica alinhada ao objetivo. ' +
    'Monetização responsável não pressiona, não esconde termos e não incentiva endividamento.',
  reference:
    'Monetização responsável: transparência, adequação ao perfil, canal claro e métrica alinhada ao objetivo.',
}

// ============================================================
// EXPORTS
// ============================================================

export const contentVersion = 'v4'

export const extendedQuestions: QuizQuestion[] = Array.from({ length: 52 }, (_, index) => {
  const phase = (index % 4) + 1
  const topics = [
    ['Objetivo da campanha', 'Uma base de clientes ativos está usando pouco o cartão. O objetivo é aumentar a frequência de uso em compras do dia a dia. Qual direção é mais adequada?', 'Engajamento da base ativa', ['Aquisição de novos clientes', 'Engajamento da base ativa', 'Retenção contra cancelamento', 'Monetização sem segmentação']],
    ['Métrica de sucesso', 'Uma campanha pretende levar clientes elegíveis a fazer sua primeira compra. Qual indicador deve orientar a decisão?', 'Taxa de conversão para primeira compra.', ['Impressões da mensagem', 'Cliques no banner', 'Taxa de conversão para primeira compra', 'Quantidade de mensagens enviadas']],
    ['Leitura de resultados', 'A campanha A teve 8% de cliques e 1% de conversão. A campanha B teve 4% de cliques e 3% de conversão. O que os dados indicam?', 'A campanha B converte melhor, mesmo com menos cliques.', ['A campanha A é melhor por ter mais cliques', 'A campanha B converte melhor, mesmo com menos cliques', 'As campanhas são iguais', 'Cliques e conversões representam a mesma coisa']],
    ['Próximo experimento', 'Uma variação aumentou a conversão, mas a amostra ainda é pequena. Qual é o próximo passo responsável?', 'Continuar o teste com amostra adequada e monitorar os efeitos.', ['Lançar para todos imediatamente', 'Descartar o resultado sem analisar', 'Continuar o teste com amostra adequada e monitorar os efeitos', 'Escolher a versão pelo design']],
  ] as const
  const [title, scenario, correctText, options] = topics[(phase - 1)]
  const offset = index % 4
  const alternatives = options.map((text, optionIndex) => ({ id: String.fromCharCode(97 + ((optionIndex + offset) % 4)), text }))
  const correctId = alternatives.find((alternative) => alternative.text === correctText)?.id ?? 'a'
  return { id: `q${index + 5}`, phase, title, subtitle: phase === 1 ? 'Estratégia de Growth' : phase === 2 ? 'Métricas acionáveis' : phase === 3 ? 'Análise de performance' : 'Experimentação', scenario: `${scenario}\n\nRodada de conteúdo ${index + 1}.`, alternatives, correctId, explanation: `${correctText} A resposta deve estar alinhada ao objetivo, ao contexto e à métrica de negócio.`, reference: 'Growth orientado por hipótese, evidência e iteração.' }
})

const hubQuestionSeeds: [string, string, string, string[]][] = [
  ['Qual métrica representa melhor o resultado incremental de uma campanha?', 'O time quer saber quanto resultado adicional a campanha gerou em comparação ao comportamento esperado sem ela.', 'TPV incremental', ['Cliques totais', 'Impressões', 'TPV incremental', 'Quantidade de peças criativas']],
  ['Como interpretar o TPV incremental?', 'O dashboard mostra TPV incremental positivo após uma campanha com grupo de controle.', 'A campanha gerou resultado adicional em relação à referência.', ['A campanha teve apenas mais impressões', 'A campanha gerou resultado adicional em relação à referência.', 'Todos os clientes converteram', 'O CTR foi necessariamente o maior']],
  ['Qual pergunta o saldo parcelado ajuda a responder?', 'A liderança quer acompanhar a evolução do volume de compras parceladas.', 'Quanto volume está associado a compras parceladas.', ['Quantas notificações foram abertas', 'Quanto volume está associado a compras parceladas.', 'Qual foi o custo da mídia', 'Quantos clientes visualizaram o ranking']],
  ['Qual é a melhor leitura da taxa de conversão?', 'Uma campanha recebeu 1.000 exposições e gerou 50 conversões.', '5% das exposições resultaram em conversão.', ['50% das pessoas clicaram', '5% das exposições resultaram em conversão.', '1.000 pessoas compraram', 'A receita cresceu 50%']],
  ['Para que serve o CTR médio?', 'O time quer avaliar a capacidade da mensagem de gerar interação.', 'Medir a proporção de cliques em relação às exposições.', ['Medir estoque disponível', 'Medir a proporção de cliques em relação às exposições.', 'Medir o TPV incremental diretamente', 'Medir quantidade de campanhas ativas']],
  ['O que campanhas ativas representam?', 'A liderança deseja saber quantas iniciativas estão em execução no período selecionado.', 'Campanhas em execução ou disponíveis no recorte analisado.', ['Somente campanhas encerradas', 'Campanhas em execução ou disponíveis no recorte analisado.', 'Quantidade de clientes inadimplentes', 'Quantidade de cliques inválidos']],
  ['Como usar a cobertura por frente?', 'Aquisição apresenta 72%, enquanto Retenção apresenta 40%.', 'Identificar onde há maior ou menor cobertura de iniciativas.', ['Escolher automaticamente a campanha vencedora', 'Identificar onde há maior ou menor cobertura de iniciativas.', 'Substituir a taxa de conversão', 'Ordenar clientes por telefone']],
  ['O que o radar de performance compara?', 'O gráfico reúne dimensões de diferentes frentes de Growth.', 'O desempenho relativo entre dimensões da estratégia.', ['Somente o estoque de prêmios', 'O desempenho relativo entre dimensões da estratégia.', 'A posição individual no ranking', 'A velocidade do QR code']],
  ['Por que uma categoria técnica não deve aparecer no radar?', 'Uma categoria de taxonomia não mapeada aparece no retorno, mas não representa uma dimensão de negócio.', 'Porque ela distorce a leitura estratégica do gráfico.', ['Porque sempre tem o maior valor', 'Porque ela distorce a leitura estratégica do gráfico.', 'Porque é uma campanha premium', 'Porque substitui o CTR']],
  ['Como interpretar o mix de produtos?', 'O gráfico mostra a distribuição do resultado entre diferentes produtos.', 'Comparar a participação relativa de cada produto no resultado.', ['Verificar somente o produto mais antigo', 'Comparar a participação relativa de cada produto no resultado.', 'Calcular o telefone dos clientes', 'Definir o horário do evento']],
  ['O que muda ao selecionar 7 dias na Overview?', 'A liderança quer uma visão mais recente da operação.', 'Os indicadores passam a considerar o intervalo de 7 dias.', ['O histórico inteiro é apagado', 'Os indicadores passam a considerar o intervalo de 7 dias.', 'O ranking deixa de existir', 'O QR é regenerado']],
  ['Quando usar uma janela de 90 dias?', 'O objetivo é enxergar tendência e comportamento de médio prazo.', 'Para analisar uma série mais ampla e reduzir ruído de curto prazo.', ['Para acelerar uma animação', 'Para analisar uma série mais ampla e reduzir ruído de curto prazo.', 'Para validar apenas um clique', 'Para ocultar campanhas']],
  ['O que uma conversão alta com CTR baixo pode indicar?', 'Poucas pessoas clicaram, mas quem clicou avançou com qualidade.', 'A mensagem alcançou pouca interação, mas teve boa eficiência após o clique.', ['Que não houve nenhuma conversão', 'A mensagem alcançou pouca interação, mas teve boa eficiência após o clique.', 'Que o estoque acabou', 'Que o radar está inválido']],
  ['O que um CTR alto com conversão baixa pode indicar?', 'Muitos usuários interagiram, mas poucos concluíram o objetivo.', 'A comunicação gera interesse, mas há fricção depois do clique.', ['A campanha é automaticamente vencedora', 'A comunicação gera interesse, mas há fricção depois do clique.', 'O TPV incremental é sempre negativo', 'Não é possível testar melhorias']],
  ['Qual é o cuidado ao comparar períodos?', 'Os períodos possuem durações e bases diferentes.', 'Verificar se o recorte e a base são comparáveis.', ['Comparar apenas cores do gráfico', 'Verificar se o recorte e a base são comparáveis.', 'Ignorar a data de referência', 'Escolher o maior número']],
  ['O que fazer quando o resultado incremental é negativo?', 'A campanha ficou abaixo do comportamento esperado da referência.', 'Investigar hipótese, segmentação, oferta e possíveis efeitos adversos.', ['Escalar imediatamente', 'Investigar hipótese, segmentação, oferta e possíveis efeitos adversos.', 'Apagar o histórico', 'Usar somente impressões']],
  ['Qual decisão combina com baixo desempenho em Aquisição?', 'A cobertura de aquisição está baixa e há oportunidade na base elegível.', 'Revisar segmentação e testar uma iniciativa de aquisição coerente.', ['Ignorar a frente', 'Revisar segmentação e testar uma iniciativa de aquisição coerente.', 'Aumentar todas as métricas manualmente', 'Remover o filtro de período']],
  ['Qual decisão combina com baixa Retenção?', 'Clientes recorrentes apresentam queda de frequência.', 'Investigar sinais de churn e criar uma ação de retenção relevante.', ['Oferecer a mesma mensagem para todos', 'Investigar sinais de churn e criar uma ação de retenção relevante.', 'Avaliar apenas impressões', 'Desconsiderar o histórico']],
  ['Qual é uma boa prática ao analisar Monetização?', 'A equipe quer aumentar resultado sem incentivar oferta inadequada.', 'Equilibrar resultado, elegibilidade, transparência e sustentabilidade.', ['Maximizar pressão comercial', 'Equilibrar resultado, elegibilidade, transparência e sustentabilidade.', 'Oferecer crédito indiscriminadamente', 'Omitir condições']],
  ['O que uma data de referência informa?', 'O dashboard apresenta a data usada como base para os indicadores.', 'O momento do recorte ao qual os dados se referem.', ['A data de criação do QR', 'O momento do recorte ao qual os dados se referem.', 'A senha do admin', 'O nome do participante']],
  ['Por que olhar TPV incremental e conversão juntos?', 'Uma campanha pode converter mais sem gerar impacto financeiro adicional relevante.', 'Para relacionar eficiência de conversão com resultado incremental.', ['Para substituir o radar', 'Para relacionar eficiência de conversão com resultado incremental.', 'Para calcular o estoque', 'Para definir o apelido']],
  ['Como escolher uma métrica principal?', 'O objetivo da campanha é reativar clientes com baixo uso.', 'Escolher a métrica que representa diretamente a reativação.', ['Impressões sempre', 'Escolher a métrica que representa diretamente a reativação.', 'Quantidade de criativos', 'Tamanho do ranking']],
  ['O que significa uma métrica de vaidade?', 'O indicador cresce, mas não demonstra necessariamente o resultado de negócio.', 'Uma métrica que pode parecer positiva sem provar impacto relevante.', ['Uma métrica sempre inválida', 'Uma métrica que pode parecer positiva sem provar impacto relevante.', 'Uma taxa de conversão', 'Um filtro de 30 dias']],
  ['Como o filtro ajuda na análise?', 'A liderança quer comparar rapidamente períodos diferentes.', 'Permite observar o mesmo conjunto de indicadores em recortes temporais distintos.', ['Altera o gabarito', 'Permite observar o mesmo conjunto de indicadores em recortes temporais distintos.', 'Cria uma campanha', 'Remove o backend']],
  ['O que fazer com uma anomalia no gráfico?', 'Uma dimensão apresenta uma mudança muito diferente das demais.', 'Investigar dados, período, população e contexto antes de concluir.', ['Assumir que é sucesso', 'Investigar dados, período, população e contexto antes de concluir.', 'Excluir o ponto', 'Ignorar o gráfico']],
  ['Qual é o papel da hipótese?', 'Antes de lançar a campanha, o time precisa explicar por que a ação pode funcionar.', 'Orientar o experimento e definir o que será testado.', ['Substituir a métrica', 'Orientar o experimento e definir o que será testado.', 'Garantir 6/6', 'Definir o estoque']],
  ['O que é uma boa segmentação?', 'A campanha tem uma necessidade específica e critérios de elegibilidade.', 'Selecionar um público coerente com o problema e a proposta.', ['Enviar para toda a base sem critério', 'Selecionar um público coerente com o problema e a proposta.', 'Usar somente o nome', 'Escolher pelo ranking']],
  ['Por que registrar a versão do conteúdo?', 'Duas tentativas podem ter recebido perguntas de versões diferentes.', 'Para saber qual conteúdo e regra foram usados em cada tentativa.', ['Para alterar respostas antigas', 'Para saber qual conteúdo e regra foram usados em cada tentativa.', 'Para exibir telefone', 'Para acelerar o áudio']],
  ['Como interpretar uma alta em campanhas ativas?', 'O número de iniciativas subiu, mas os resultados ainda não foram analisados.', 'Há mais iniciativas, mas isso não prova maior impacto.', ['O resultado necessariamente dobrou', 'Há mais iniciativas, mas isso não prova maior impacto.', 'O CTR é zero', 'O ranking fechou']],
  ['O que fazer antes de escalar uma campanha?', 'O experimento teve resultado promissor em uma amostra.', 'Validar evidências, riscos, elegibilidade e capacidade operacional.', ['Escalar sem monitoramento', 'Validar evidências, riscos, elegibilidade e capacidade operacional.', 'Trocar o objetivo', 'Excluir o controle']],
  ['Como ler uma diferença entre frentes?', 'Aquisição tem desempenho maior que Monetização em uma mesma janela.', 'Investigar contexto e objetivo de cada frente antes de comparar.', ['Declarar uma vencedora universal', 'Investigar contexto e objetivo de cada frente antes de comparar.', 'Somar percentuais sem contexto', 'Ignorar a população']],
  ['O que caracteriza uma campanha coerente?', 'Público, oferta, canal e métrica respondem ao mesmo objetivo.', 'Os componentes da campanha são consistentes entre si.', ['Cada componente aponta para um objetivo diferente', 'Os componentes da campanha são consistentes entre si.', 'A oferta é indiscriminada', 'O canal é escolhido ao acaso']],
  ['Qual é a função do grupo de controle?', 'O time quer estimar o que teria acontecido sem a intervenção.', 'Servir de referência para estimar o impacto incremental.', ['Aumentar impressões', 'Servir de referência para estimar o impacto incremental.', 'Substituir a segmentação', 'Definir o ranking']],
  ['Por que evitar conclusões só pelo CTR?', 'A interação não garante que o objetivo final aconteceu.', 'Porque clique é uma etapa intermediária, não necessariamente o resultado final.', ['Porque CTR não pode ser medido', 'Porque clique é uma etapa intermediária, não necessariamente o resultado final.', 'Porque o radar não usa porcentagem', 'Porque campanhas não têm objetivo']],
  ['O que o mix pode revelar?', 'Um produto concentra a maior parte do resultado do período.', 'A distribuição do resultado e possíveis concentrações por produto.', ['A senha do participante', 'A distribuição do resultado e possíveis concentrações por produto.', 'A velocidade do áudio', 'A validade do QR']],
  ['Como agir diante de concentração excessiva em um produto?', 'Quase todo o resultado vem de um único produto.', 'Avaliar dependência, oportunidade de diversificação e contexto.', ['Apagar o produto', 'Avaliar dependência, oportunidade de diversificação e contexto.', 'Assumir que os demais são inválidos', 'Ignorar o mix']],
  ['Qual é a relação entre cobertura e decisão?', 'Uma frente tem baixa cobertura e uma hipótese relevante ainda não foi testada.', 'A lacuna pode orientar priorização de novos experimentos.', ['A cobertura define o gabarito', 'A lacuna pode orientar priorização de novos experimentos.', 'A cobertura substitui o resultado', 'A cobertura mede telefone']],
  ['Como o dashboard apoia a liderança?', 'A liderança precisa consolidar indicadores e encontrar pontos de atenção.', 'Oferecendo uma visão comparável para orientar decisões.', ['Decidindo sozinha sem contexto', 'Oferecendo uma visão comparável para orientar decisões.', 'Garantindo o resultado', 'Eliminando experimentos']],
  ['Por que uma campanha precisa de métrica primária?', 'Há vários indicadores disponíveis, mas uma decisão precisa de foco.', 'Para definir o principal critério de sucesso do experimento.', ['Para esconder métricas ruins', 'Para definir o principal critério de sucesso do experimento.', 'Para excluir o público', 'Para gerar QR']],
  ['O que fazer quando a métrica melhora, mas o custo também sobe?', 'O resultado aumentou junto com um custo operacional maior.', 'Avaliar eficiência, retorno incremental e sustentabilidade.', ['Considerar sucesso automaticamente', 'Avaliar eficiência, retorno incremental e sustentabilidade.', 'Ignorar o custo', 'Trocar todos os clientes']],
  ['Como avaliar uma campanha de produto?', 'O mix mostra produtos com respostas diferentes ao mesmo estímulo.', 'Comparar desempenho por produto e contexto da oferta.', ['Somar todos sem segmentar', 'Comparar desempenho por produto e contexto da oferta.', 'Escolher pelo nome', 'Usar somente o CTR']],
  ['O que diferencia análise de decisão?', 'O gráfico mostra os dados, mas a equipe precisa definir o próximo passo.', 'A decisão conecta evidências a uma ação testável.', ['A decisão ignora evidências', 'A decisão conecta evidências a uma ação testável.', 'A análise é sempre opinião', 'A decisão é sempre escalar']],
  ['Qual pergunta a Overview deve responder?', 'A liderança abriu a tela consolidada do Hub.', 'Onde estamos, o que mudou e qual frente merece atenção?', ['Qual usuário tem maior telefone', 'Onde estamos, o que mudou e qual frente merece atenção?', 'Qual QR é mais bonito', 'Qual cor tem maior CTR']],
  ['Como usar uma visão consolidada sem simplificar demais?', 'Os KPIs mostram um resumo, mas cada indicador possui contexto próprio.', 'Usar os cards para orientar investigação nos detalhes.', ['Tratar todo KPI como igual', 'Usar os cards para orientar investigação nos detalhes.', 'Ignorar os filtros', 'Decidir pelo maior número']],
] as [string, string, string, string[]][]

export const hubQuestions: QuizQuestion[] = hubQuestionSeeds.map(([title, scenario, correctText, options], index) => {
  const phase = (index % 4) + 1
  const offset = (index * 3) % 4
  const alternatives = options.map((text, optionIndex) => ({ id: String.fromCharCode(97 + ((optionIndex + offset) % 4)), text }))
  const correctId = alternatives.find((alternative) => alternative.text === correctText)?.id ?? 'a'
  return { id: `hub-${index + 1}`, phase, title, subtitle: 'Growth Intelligence Hub', scenario, alternatives, correctId, explanation: `${correctText} Essa leitura conecta o indicador ao contexto de decisão do Hub.`, reference: 'Growth Intelligence Hub — visão consolidada para decisão orientada por evidências.' }
})

export const advancedHubQuestions: QuizQuestion[] = [
  {
    id: 'advanced-hub-01', phase: 1, title: 'Impacto incremental versus conversão', subtitle: 'Overview • decisão executiva',
    scenario: 'A Campanha A tem taxa de conversão de 8%, mas TPV incremental próximo de zero. A Campanha B converte 5%, porém apresenta TPV incremental positivo e consistente contra o controle. Qual leitura é mais adequada para a liderança?',
    alternatives: [
      { id: 'a', text: 'A Campanha A é necessariamente superior porque converte mais.' },
      { id: 'b', text: 'A Campanha B pode ser mais relevante para o negócio, pois demonstra impacto adicional.' },
      { id: 'c', text: 'As campanhas são equivalentes porque ambas têm conversão.' },
      { id: 'd', text: 'A Campanha A deve ser escalada antes de analisar o grupo de controle.' },
    ], correctId: 'b', explanation: 'Conversão mede uma etapa do funil; o TPV incremental ajuda a avaliar o resultado adicional em relação à referência.', reference: 'Overview — TPV incremental e taxa de conversão.'
  },
  {
    id: 'advanced-hub-02', phase: 2, title: 'CTR alto, conversão baixa', subtitle: 'Overview • diagnóstico de funil',
    scenario: 'Após o filtro de 30 dias, uma frente apresenta CTR acima das demais, mas taxa de conversão abaixo da média. Qual investigação deve vir primeiro?',
    alternatives: [
      { id: 'a', text: 'Escalar a comunicação, pois o CTR prova que a campanha funciona.' },
      { id: 'b', text: 'Investigar a coerência entre promessa, público, oferta e etapa após o clique.' },
      { id: 'c', text: 'Descartar o CTR e analisar apenas campanhas ativas.' },
      { id: 'd', text: 'Trocar o período para 7 dias até a conversão subir.' },
    ], correctId: 'b', explanation: 'O descolamento entre interação e conversão sugere fricção ou desalinhamento após o clique.', reference: 'Overview — CTR médio e taxa de conversão.'
  },
  {
    id: 'advanced-hub-03', phase: 3, title: 'Cobertura não é impacto', subtitle: 'Frentes de Growth',
    scenario: 'Aquisição possui 90% de cobertura, mas baixo TPV incremental. Retenção possui 45% de cobertura e impacto incremental positivo. Ao considerar também a confiabilidade da amostra e a persistência do efeito, qual priorização é mais defensável?',
    alternatives: [
      { id: 'a', text: 'Priorizar Aquisição porque sua cobertura é maior.' },
      { id: 'b', text: 'Priorizar Retenção automaticamente porque sua cobertura é menor.' },
      { id: 'c', text: 'Priorizar a investigação de Retenção, validando amostra, persistência do efeito e potencial de expansão antes de escalar.' },
      { id: 'd', text: 'Somar as porcentagens de cobertura para definir a prioridade.' },
    ], correctId: 'c', explanation: 'A decisão deve combinar cobertura, impacto, confiabilidade da evidência e possibilidade de expansão; cobertura isolada não define prioridade.', reference: 'Overview — cobertura por frente.'
  },
  {
    id: 'advanced-hub-04', phase: 4, title: 'Radar e categoria técnica', subtitle: 'Performance Radar',
    scenario: 'O Radar apresenta Aquisição, Retenção, Monetização e uma categoria não mapeada com valor extremo. Antes de apresentar o gráfico, a liderança precisa preservar a comparabilidade sem apagar o problema de origem. Qual procedimento é mais adequado?',
    alternatives: [
      { id: 'a', text: 'Manter tudo para preservar integralmente o retorno da API.' },
      { id: 'b', text: 'Filtrar a categoria técnica da visualização, registrar a ocorrência e investigar sua origem separadamente.' },
      { id: 'c', text: 'Substituir o valor extremo pela média das outras dimensões sem registrar a alteração.' },
      { id: 'd', text: 'Excluir a dimensão com menor valor para equilibrar o radar.' },
    ], correctId: 'b', explanation: 'Uma categoria técnica não mapeada não deve contaminar a leitura estratégica; sua origem deve ser tratada fora do gráfico.', reference: 'Overview — Performance Radar.'
  },
  {
    id: 'advanced-hub-05', phase: 1, title: 'Período e sazonalidade', subtitle: 'Filtros da Overview',
    scenario: 'O TPV incremental subiu no recorte de 7 dias, mas caiu no de 90 dias. Não houve mudança conhecida no produto. Qual conclusão é mais responsável?',
    alternatives: [
      { id: 'a', text: 'A campanha é vencedora porque o recorte mais recente sempre prevalece.' },
      { id: 'b', text: 'A campanha falhou porque o recorte de 90 dias é sempre mais confiável.' },
      { id: 'c', text: 'Investigar janela, sazonalidade, base e persistência do efeito antes de concluir.' },
      { id: 'd', text: 'Escolher o período que produz o melhor número para a apresentação.' },
    ], correctId: 'c', explanation: 'Recortes diferentes podem capturar momentos distintos; a divergência exige investigação, não seleção oportunista.', reference: 'Overview — filtros de 7, 30 e 90 dias.'
  },
  {
    id: 'advanced-hub-06', phase: 2, title: 'Mix de produtos e concentração', subtitle: 'Mix de produtos',
    scenario: 'Um produto concentra 80% do TPV incremental, mas possui conversão menor que os demais. Qual análise evita uma decisão precipitada?',
    alternatives: [
      { id: 'a', text: 'Desconsiderar o produto porque sua conversão é menor.' },
      { id: 'b', text: 'Analisar volume, base exposta, elegibilidade e contribuição incremental antes de comparar eficiência.' },
      { id: 'c', text: 'Escolher o produto com maior CTR, independentemente do impacto.' },
      { id: 'd', text: 'Dividir o resultado igualmente entre todos os produtos.' },
    ], correctId: 'b', explanation: 'Volume, taxa e impacto respondem perguntas diferentes; o mix deve ser lido com denominadores e contexto.', reference: 'Overview — mix de produtos.'
  },
  {
    id: 'advanced-hub-07', phase: 3, title: 'Campanhas ativas e resultado', subtitle: 'Campanhas ativas',
    scenario: 'O número de campanhas ativas dobrou, mas a cobertura e o impacto incremental permaneceram estáveis. A maior parte das novas campanhas está concentrada no mesmo produto. Qual hipótese merece investigação primeiro?',
    alternatives: [
      { id: 'a', text: 'Mais campanhas sempre significam mais crescimento.' },
      { id: 'b', text: 'Pode haver sobreposição de público, saturação ou duplicidade de iniciativas sem contribuição incremental.' },
      { id: 'c', text: 'O dashboard está errado porque campanhas ativas devem aumentar o TPV.' },
      { id: 'd', text: 'A solução é aumentar ainda mais a quantidade de campanhas.' },
    ], correctId: 'b', explanation: 'Quantidade de iniciativas não comprova qualidade, alcance efetivo ou impacto adicional.', reference: 'Overview — Campanhas ativas.'
  },
  {
    id: 'advanced-hub-08', phase: 4, title: 'Data de referência', subtitle: 'Leitura executiva',
    scenario: 'Dois cards mostram valores diferentes e possuem datas de referência distintas. A diferença persiste quando o mesmo período é aplicado aos dois cards, mas as bases elegíveis também mudam. Qual procedimento evita uma comparação incorreta?',
    alternatives: [
      { id: 'a', text: 'Comparar apenas os números absolutos.' },
      { id: 'b', text: 'Alinhar datas, período e definição da base elegível antes de interpretar a diferença.' },
      { id: 'c', text: 'Usar o card com o maior valor como fonte oficial.' },
      { id: 'd', text: 'Excluir a data porque ela é apenas informativa.' },
    ], correctId: 'b', explanation: 'Métricas em recortes temporais diferentes não são diretamente comparáveis.', reference: 'Overview — data de referência.'
  },
  {
    id: 'advanced-hub-09', phase: 1, title: 'Métrica norteadora', subtitle: 'Decisão de Growth',
    scenario: 'O objetivo é aumentar o uso recorrente de clientes já ativos. A equipe sugere usar impressões como KPI principal porque é a métrica com maior crescimento. Qual alternativa corrige a decisão?',
    alternatives: [
      { id: 'a', text: 'Manter impressões: crescimento de alcance sempre representa engajamento.' },
      { id: 'b', text: 'Escolher uma métrica de comportamento recorrente alinhada ao objetivo e usar impressões como apoio.' },
      { id: 'c', text: 'Trocar o objetivo para aquisição para combinar com impressões.' },
      { id: 'd', text: 'Usar o maior número disponível como KPI.' },
    ], correctId: 'b', explanation: 'O KPI principal deve representar o comportamento que a iniciativa pretende mudar.', reference: 'Overview — KPIs acionáveis.'
  },
  {
    id: 'advanced-hub-10', phase: 2, title: 'Efeito incremental e controle', subtitle: 'Medição de campanha',
    scenario: 'A conversão cresceu tanto no grupo exposto quanto no controle. O que é necessário para atribuir o crescimento à campanha?',
    alternatives: [
      { id: 'a', text: 'Usar somente a conversão do grupo exposto.' },
      { id: 'b', text: 'Comparar a diferença entre grupos e verificar se o efeito excede a variação esperada.' },
      { id: 'c', text: 'Considerar todo crescimento como incremental.' },
      { id: 'd', text: 'Ignorar o controle porque ele não recebeu comunicação.' },
    ], correctId: 'b', explanation: 'O controle ajuda a separar o efeito da campanha de movimentos que ocorreriam sem intervenção.', reference: 'Overview — resultado incremental.'
  },
  {
    id: 'advanced-hub-11', phase: 3, title: 'Prioridade de investigação', subtitle: 'Cockpit da liderança',
    scenario: 'A Overview mostra CTR estável, conversão em queda, TPV incremental incerto e aumento de campanhas ativas concentradas em um produto. Qual deve ser o primeiro foco da investigação?',
    alternatives: [
      { id: 'a', text: 'Criar mais campanhas para compensar a queda.' },
      { id: 'b', text: 'Investigar a queda de conversão, a contribuição incremental e a possível saturação antes de aumentar iniciativas.' },
      { id: 'c', text: 'Celebrar o CTR estável como prova de sucesso.' },
      { id: 'd', text: 'Escolher o produto com mais impressões.' },
    ], correctId: 'b', explanation: 'A prioridade deve atacar o resultado de negócio e evitar escalar iniciativas sem evidência de impacto.', reference: 'Overview — leitura consolidada.'
  },
  {
    id: 'advanced-hub-12', phase: 4, title: 'Decisão baseada em múltiplos sinais', subtitle: 'Growth Intelligence Hub',
    scenario: 'Uma frente tem cobertura baixa, CTR alto e TPV incremental ainda não conclusivo. O resultado inicial veio de uma amostra pequena e concentrada em um único produto. Qual próximo passo é mais rigoroso?',
    alternatives: [
      { id: 'a', text: 'Escalar imediatamente pelo CTR alto.' },
      { id: 'b', text: 'Encerrar porque a cobertura é baixa.' },
      { id: 'c', text: 'Ampliar a evidência com teste controlado, diversificar a amostra e acompanhar conversão e impacto incremental.' },
      { id: 'd', text: 'Substituir o objetivo por CTR.' },
    ], correctId: 'c', explanation: 'O sinal inicial é promissor, mas ainda não responde se houve impacto adicional sustentável.', reference: 'Overview — cobertura, CTR e impacto.'
  },
]

const suppliedQuestionSeeds: Array<{ difficulty: 'easy' | 'medium' | 'hard'; title: string; scenario: string; options: string[]; correct: number }> = [
  { difficulty: 'easy', title: 'O que significa Growth?', scenario: 'No contexto do projeto, o que significa Growth?', options: ['Atendimento.', 'Crescimento.', 'Investimento.', 'Comunicação.'], correct: 1 },
  { difficulty: 'easy', title: 'Finalidade do Growth Intelligence', scenario: 'Qual é a principal finalidade do Growth Intelligence?', options: ['Organizar indicadores de campanhas para apoiar decisões de Growth.', 'Programar o envio de campanhas para os públicos selecionados.', 'Administrar a contratação de produtos para os clientes interessados.', 'Centralizar o atendimento da empresa nos canais de comunicação.'], correct: 0 },
  { difficulty: 'easy', title: 'Campanha', scenario: 'O que é uma campanha nesse contexto?', options: ['Uma reunião organizada pela equipe para discutir resultados recentes.', 'Um relatório consolidado com as movimentações financeiras de clientes.', 'Um cadastro atualizado com os produtos disponíveis na empresa.', 'Uma comunicação direcionada a um público com objetivo definido.'], correct: 3 },
  { difficulty: 'easy', title: 'Canais de comunicação', scenario: 'Qual alternativa apresenta exemplos de canais de comunicação?', options: ['Conversão, cliques e abertura.', 'Campanha, público e produto.', 'E-mail, SMS e push.', 'Custo, alcance e engajamento.'], correct: 2 },
  { difficulty: 'easy', title: 'Conversão', scenario: 'O que significa uma conversão?', options: ['A mensagem ser enviada ao público selecionado pela equipe.', 'A pessoa realizar a ação definida como objetivo da campanha.', 'O resultado ser incluído no relatório apresentado pela plataforma.', 'O cliente ser incluído no segmento escolhido para comunicação.'], correct: 1 },
  { difficulty: 'easy', title: 'CTR', scenario: 'O que o CTR representa?', options: ['O custo total de uma campanha.', 'O número de campanhas em atividade.', 'O volume financeiro movimentado pela campanha.', 'A taxa de cliques de uma campanha.'], correct: 3 },
  { difficulty: 'easy', title: 'TPV incremental', scenario: 'O TPV incremental representa:', options: ['O volume adicional transacionado estimado para uma ação.', 'O lucro líquido calculado depois dos custos da ação.', 'O valor total investido para alcançar o público selecionado.', 'O saldo financeiro disponível para realizar a próxima campanha.'], correct: 0 },
  { difficulty: 'easy', title: 'Taxonomia', scenario: 'O que é a taxonomia das campanhas?', options: ['O calendário dos envios previstos para cada campanha.', 'O orçamento dos canais utilizados em cada campanha.', 'O padrão de nomes e classificações das campanhas.', 'O histórico de reuniões realizadas sobre as campanhas.'], correct: 2 },
  { difficulty: 'easy', title: 'Tela Overview', scenario: 'O que a pessoa encontra na tela Overview?', options: ['Conversas anteriores e perguntas já enviadas à inteligência artificial.', 'Indicadores consolidados que oferecem uma visão geral dos resultados.', 'Dados individuais dos clientes incluídos nos públicos das campanhas.', 'Configurações de envio e horários programados para as próximas mensagens.'], correct: 1 },
  { difficulty: 'medium', title: 'Comparação de períodos', scenario: 'Por que é importante observar o período ao comparar duas campanhas na plataforma?', options: ['Para comparar os resultados em condições e recortes semelhantes.', 'Para identificar o canal utilizado por cada público selecionado.', 'Para favorecer a campanha que permaneceu ativa por mais tempo.', 'Para escolher os dias que apresentaram os melhores resultados.'], correct: 0 },
  { difficulty: 'medium', title: 'Automação e Optimizer', scenario: 'Qual é a diferença entre as áreas de Automação e Optimizer?', options: ['Automação acompanha custos; Optimizer define o orçamento das campanhas.', 'Automação registra reuniões; Optimizer organiza o histórico das decisões.', 'Automação organiza públicos; Optimizer padroniza os nomes das campanhas.', 'Automação monitora jornadas; Optimizer aponta problemas e sugere melhorias.'], correct: 3 },
  { difficulty: 'medium', title: 'Logs e Acessos', scenario: 'Uma pessoa quer consultar uma ação já realizada na plataforma e verificar quando ela aconteceu. Qual área deve procurar?', options: ['Overview, para consultar os registros das decisões tomadas pela equipe.', 'Analytics, para consultar a evolução das alterações de cada campanha.', 'Logs e Acessos, para consultar as ações e suas datas.', 'Automação, para consultar as operações realizadas nas jornadas de clientes.'], correct: 2 },
  { difficulty: 'medium', title: 'Acompanhamento de ação', scenario: 'A equipe identificou uma ação crítica e precisa organizar seu acompanhamento. Quais recursos ajudam nessa tarefa?', options: ['Alcance dos canais, abertura das mensagens e custos financeiros.', 'Responsável pela ação, situação atual e agendamento de reuniões.', 'Mix de produtos, CTR médio e quantidade de campanhas.', 'Tamanho dos segmentos, grupo de controle e conversão média.'], correct: 1 },
  { difficulty: 'medium', title: 'Growth Compass', scenario: 'Uma pessoa quer fazer perguntas sobre os indicadores e explorar explicações em uma conversa. Qual recurso atende melhor a essa necessidade?', options: ['Growth Compass.', 'Histórico de auditoria.', 'Gerenciador de reuniões.', 'Taxonomy Manager.'], correct: 0 },
  { difficulty: 'medium', title: 'Cliques e conversões', scenario: 'Na Analytics, uma campanha apresenta muitos cliques, mas poucas conversões. Qual interpretação é mais adequada?', options: ['Os cliques indicam que o objetivo final foi alcançado.', 'A baixa conversão identifica o canal como causa principal.', 'O alcance precisa aumentar antes de avaliar o resultado.', 'Há interesse inicial, mas é necessário investigar a conversão.'], correct: 3 },
  { difficulty: 'hard', title: 'Inconsistência de taxonomia', scenario: 'Um produto foi registrado com nomes diferentes em várias campanhas. Parte dos resultados aparece em um grupo e parte em outro. Qual área ajuda a investigar esse problema e por quê?', options: ['Overview, porque os totais financeiros recompõem as campanhas classificadas separadamente.', 'Automação, porque a eficiência das jornadas determina a classificação dos produtos.', 'Qualidade/Taxonomia, porque nomes inconsistentes podem separar resultados do mesmo produto.', 'Logs e Acessos, porque os registros de ações corrigem classificações duplicadas.'], correct: 2 },
  { difficulty: 'hard', title: 'Custo por conversão', scenario: 'Duas campanhas têm públicos e objetivos comparáveis e foram avaliadas no mesmo período. A Campanha A tem CTR de 4%, 100 conversões, custo total de R$ 1.000 e custo por conversão de R$ 10. A Campanha B tem CTR de 8%, 150 conversões, custo total de R$ 2.100 e custo por conversão de R$ 14. Se o objetivo é conseguir conversões com menor custo, qual decisão tem melhor fundamento?', options: ['Priorizar B, considerando o maior número total de conversões.', 'Priorizar B, considerando o maior interesse indicado pelo CTR.', 'Distribuir igualmente, considerando a semelhança dos públicos das campanhas.', 'Testar investimento em A, considerando o menor custo por conversão.'], correct: 3 },
  { difficulty: 'hard', title: 'Grupo de controle', scenario: 'Após uma campanha, a plataforma mostra um aumento nas conversões. Uma pessoa conclui que todo o aumento foi provocado pela campanha. Como os dados de segmentação e grupo de controle ajudam a avaliar essa conclusão?', options: ['Comparando grupos semelhantes, com e sem a ação avaliada.', 'Comparando as quantidades totais, sem considerar o tamanho dos grupos.', 'Retirando as conversões do controle antes de interpretar os resultados.', 'Substituindo a taxa de conversão pela quantidade de mensagens enviadas.'], correct: 0 },
  { difficulty: 'hard', title: 'Priorização no Optimizer', scenario: 'No Optimizer, a equipe encontra duas sugestões. A Sugestão A tem impacto alto, esforço alto e prazo de três semanas. A Sugestão B tem impacto moderado, esforço baixo e prazo de três dias. A equipe tem poucos recursos e precisa realizar um primeiro teste em até uma semana. Qual decisão considera melhor esse contexto?', options: ['Priorizar A, considerando seu maior impacto potencial para o negócio.', 'Priorizar B, considerando esforço e prazo compatíveis com a entrega.', 'Executar ambas, considerando que cada uma resolve um problema diferente.', 'Adiar ambas, aguardando outra sugestão com impacto e prazo intermediários.'], correct: 1 },
]

const suppliedExplanations = [
  'Growth significa crescimento. Neste projeto, o foco é apoiar o crescimento com informações e decisões.',
  'O Growth Intelligence organiza indicadores para apoiar decisões; não é a ferramenta responsável pelo envio ou pela contratação de produtos.',
  'Uma campanha é uma comunicação direcionada a um público com um objetivo definido, não uma reunião ou um relatório.',
  'E-mail, SMS e push são canais. Conversão e cliques são indicadores, não meios de comunicação.',
  'Conversão acontece quando a pessoa realiza a ação definida como objetivo. Enviar uma mensagem não comprova conversão.',
  'CTR é a taxa de cliques. Ele mede interação, não custo ou volume financeiro.',
  'TPV incremental estima o volume adicional transacionado associado à ação. Não equivale ao lucro líquido.',
  'Taxonomia é o padrão de nomes e classificações que permite organizar e comparar campanhas.',
  'A Overview reúne indicadores consolidados para uma visão geral dos resultados.',
  'Períodos comparáveis ajudam a evitar diferenças de recorte. Escolher apenas os melhores dias introduz viés.',
  'Automação monitora jornadas; o Optimizer aponta problemas e sugere melhorias.',
  'Logs e Acessos permitem consultar ações realizadas e suas datas, apoiando a auditoria.',
  'Responsável, situação e reuniões permitem acompanhar a execução de uma ação crítica.',
  'O Growth Compass permite explorar indicadores e explicações em uma conversa.',
  'Cliques mostram interesse inicial. Poucas conversões exigem investigação; não provam isoladamente que o canal é a causa.',
  'Nomes inconsistentes podem separar resultados do mesmo produto. Qualidade/Taxonomia ajuda a investigar a classificação.',
  'A custa R$ 10 por conversão, contra R$ 14 de B. Com objetivo de menor custo, testar investimento em A é mais fundamentado que priorizar CTR.',
  'Grupos semelhantes, com e sem a intervenção, ajudam a avaliar o que mudaria mesmo sem a campanha. Só o aumento observado não prova causalidade.',
  'B cabe em três dias e exige baixo esforço. Para um teste em até uma semana com poucos recursos, ela respeita as restrições, mesmo tendo impacto esperado menor.',
]

export const questionBank: QuizQuestion[] = suppliedQuestionSeeds.map((seed, index) => {
  const phase = seed.difficulty === 'easy' ? (index % 2) + 1 : seed.difficulty === 'medium' ? ((index - 9) % 2) + 3 : ((index - 15) % 2) + 5
  const alternatives = seed.options.map((text, optionIndex) => ({ id: String.fromCharCode(97 + optionIndex), text }))
  return { id: `supplied-${index + 1}`, phase, title: seed.title, subtitle: seed.difficulty === 'easy' ? 'Fase fácil • Growth Hub' : seed.difficulty === 'medium' ? 'Fase média • Growth Hub' : 'Fase difícil • Growth Hub', scenario: seed.scenario, alternatives, correctId: alternatives[seed.correct].id, explanation: suppliedExplanations[index], reference: 'Growth Intelligence Hub' }
})

export function selectQuestionForAttempt(qrCode: string, phase: number): QuizQuestion | undefined {
  if (!Number.isInteger(phase) || phase < 1 || phase > 6) return undefined
  const firstPhase = phase <= 2 ? 1 : phase <= 4 ? 3 : 5
  const candidates = questionBank.filter((question) => question.phase === firstPhase || question.phase === firstPhase + 1)
  const hash = Array.from(qrCode).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, firstPhase)
  const firstIndex = hash % candidates.length
  const secondIndex = (firstIndex + 1 + ((hash >>> 8) % (candidates.length - 1))) % candidates.length
  const question = candidates[phase === firstPhase ? firstIndex : secondIndex]
  if (!question) return undefined
  if (question.id === 'supplied-17') return { ...question, phase,
    scenario: 'Duas campanhas têm públicos e objetivos comparáveis e foram avaliadas no mesmo período. Se o objetivo é conseguir conversões com menor custo, qual decisão tem melhor fundamento nesses dados?',
    comparison: { headers: ['Indicador', 'Campanha A', 'Campanha B'], rows: [['CTR', '4%', '8%'], ['Conversões', '100', '150'], ['Custo total', 'R$ 1.000', 'R$ 2.100'], ['Custo/conversão', 'R$ 10', 'R$ 14']] },
  }
  if (question.id === 'supplied-19') return { ...question, phase,
    scenario: 'No Optimizer, a equipe encontra duas sugestões. Há poucos recursos disponíveis e o primeiro teste precisa ocorrer em até uma semana. Qual decisão considera melhor esse contexto?',
    comparison: { headers: ['Critério', 'Sugestão A', 'Sugestão B'], rows: [['Impacto', 'Alto', 'Moderado'], ['Esforço', 'Alto', 'Baixo'], ['Prazo', '3 semanas', '3 dias']] },
  }
  return { ...question, phase }
}

export function getQuestionByPhase(phase: number): QuizQuestion | undefined {
  return questionBank.find((q) => q.phase === phase)
}

export function getSimulatorByPhase(phase: number): SimulatorPhase | undefined {
  if (phase === 5) return simulatorEngagement
  if (phase === 6) return simulatorMonetization
  return undefined
}

export function evaluateSimulator(
  phase: number,
  choices: { audience: string; offer: string; channel: string; metric: string }
): boolean {
  const sim = getSimulatorByPhase(phase)
  if (!sim) return false

  return sim.validCombinations.some(
    (v) =>
      v.audience === choices.audience &&
      v.offer === choices.offer &&
      v.channel === choices.channel &&
      v.metric === choices.metric
  )
}

export function getEligiblePrizeCategories(correctAnswers: number): string[] {
  const categories = ['candy', 'sticker']
  if (correctAnswers >= 3) categories.push('bookmark', 'pen')
  if (correctAnswers >= 5) categories.push('notebook', 'keychain')
  if (correctAnswers === 6) categories.push('necessaire')
  return categories
}

export const PRIZE_CATEGORIES = {
  candy: ['Bala'],
  sticker: ['Adesivo'],
  bookmark: ['Marca-página'],
  pen: ['Caneta'],
  notebook: ['Bloco de notas'],
  keychain: ['Chaveiro'],
  necessaire: ['Necessaire'],
  ranking: ['Mousepad'],
} as const
