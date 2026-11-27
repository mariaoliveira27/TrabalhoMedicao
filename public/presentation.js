import { numericValues, quantile } from './charts.js?v=rq1-violins';
import { exactProportion } from './research-tests.js?v=rq1-oito-testes';

const questionnaireGroups = [
  { label: 'RQ1 · Práticas', format: 'Uma opção', ids: ['uso', 'frequencia', 'ferramentas', 'quantidade_indicadores', 'tempo_semanal', 'desafios', 'metricas_adotadas', 'processo_avaliacao', 'criterios', 'feedback'] },
  { label: 'RQ2 · Utilidade', format: 'Escala de 1 a 5', ids: ['clareza', 'priorizacao', 'melhorias', 'exemplos_uso'] },
  { label: 'RQ3 · Justiça e satisfação', format: 'Resposta aberta', ids: ['razoes_justica', 'justica', 'satisfacao', 'razoes_satisfacao'] }
];

function countCategories(answers, key) {
  const totals = new Map();
  for (const answer of answers) {
    const label = answer[key]?.trim() || 'Sem resposta';
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}

function ratingValue(answer) {
  return Number(/^([1-5])(?:\s|$)/u.exec(String(answer ?? ''))?.[1]) || 0;
}

function ratingValues(answers, key) {
  return answers.map(answer => ratingValue(answer[key])).filter(Boolean);
}

export function presentationSlides(rows, questionnaire, selected = rows) {
  const fields = new Map(questionnaire?.sections.flatMap(section => section.questions.map(question => [question.id, question])) ?? []);
  const answers = selected.map(row => row.answers);
  const count = (key, value) => answers.filter(answer => answer[key] === value).length;
  const adoption = [
    ['Uso estruturado', count('uso', 'Sim, de forma estruturada')],
    ['Uso pontual', count('uso', 'Sim, de forma pontual')],
    ['Em implantação', count('uso', 'Está começando a utilizar')],
    ['Sem uso declarado', count('uso', 'Não utiliza')],
    ['Sem informação', answers.filter(answer => !answer.uso || answer.uso === 'Não sei informar').length]
  ];
  const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  function ratings(key, label) {
    const values = ratingValues(answers, key).sort((a, b) => a - b);
    const n = values.length;
    return {
      label, n, missing: answers.length - n,
      distribution: [1, 2, 3, 4, 5].map(rating => values.filter(value => value === rating).length),
      summary: n ? `Mediana ${number.format(quantile(values, .5))} · Q1–Q3 ${number.format(quantile(values, .25))}–${number.format(quantile(values, .75))}` : 'Sem notas de 1 a 5'
    };
  }
  const useful = [ratings('clareza', 'Tomada de decisões'), ratings('priorizacao', 'Definição de prioridades'), ratings('melhorias', 'Identificação de melhorias')];
  const pairs = Array.from({ length: 6 }, () => Array(6).fill(0));
  for (const answer of answers) {
    pairs[ratingValue(answer.justica)][ratingValue(answer.satisfacao)]++;
  }
  const paired = pairs.slice(1).reduce((sum, row) => sum + row.slice(1).reduce((n, count) => n + count, 0), 0);
  const toolCounts = new Map();
  for (const answer of answers) {
    for (const tool of new Set(Array.isArray(answer.ferramentas) ? answer.ferramentas : [])) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    }
  }
  const frequencies = countCategories(answers, 'frequencia');
  const frequencyOrder = [...(fields.get('frequencia')?.options ?? []), 'Sem resposta'];
  const orderedFrequencies = frequencyOrder.filter(label => frequencies.some(([value]) => value === label));
  for (const [label] of frequencies) if (!orderedFrequencies.includes(label)) orderedFrequencies.push(label);
  const numericSummaries = [
    ['quantidade_indicadores', 'Indicadores acompanhados', 'indicadores'],
    ['tempo_semanal', 'Tempo de acompanhamento', 'min/semana']
  ].map(([key, label, unit]) => {
    const values = numericValues(selected, key);
    const n = values.length;
    return { key, label, n, median: quantile(values, .5), q1: quantile(values, .25), q3: quantile(values, .75), unit, values };
  });
  const ratingFields = [
    ['clareza', 'Tomada de decisões'], ['priorizacao', 'Definição de prioridades'],
    ['melhorias', 'Identificação de melhorias'], ['justica', 'Justiça percebida'], ['satisfacao', 'Satisfação']
  ];
  const used = adoption[0][1] + adoption[1][1];
  const adoptionTest = exactProportion('Uso estruturado ou pontual declarado', used, answers.length);
  const definedFrequency = new Set(['Diariamente', 'Semanalmente', 'Mensalmente', 'Trimestralmente', 'Semestralmente', 'Anualmente']);
  const frequencyAnswers = answers.filter(a => definedFrequency.has(a.frequencia) || ['Sem frequência definida', 'Não há avaliação de desempenho'].includes(a.frequencia));
  const frequencyTest = { ...exactProportion('Avaliação com frequência definida', frequencyAnswers.filter(a => definedFrequency.has(a.frequencia)).length, frequencyAnswers.length), nullDescription: 'de avaliação com frequência definida' };
  const reportedTools = new Set((fields.get('ferramentas')?.options ?? []).filter(option => !['Nenhuma', 'Não sei informar'].includes(option)));
  const toolAnswers = answers.filter(a => Array.isArray(a.ferramentas) && a.ferramentas.some(tool => reportedTools.has(tool) || tool === 'Nenhuma'));
  const toolsTest = { ...exactProportion('Uso de alguma ferramenta', toolAnswers.filter(a => a.ferramentas.some(tool => reportedTools.has(tool))).length, toolAnswers.length), nullDescription: 'de uso de pelo menos uma ferramenta' };
  const scoreTests = ratingFields.map(([key, label]) => {
    const values = ratingValues(answers, key);
    return exactProportion(label, values.filter(value => value >= 4).length, values.length);
  });
  const highScores = tests => tests.map(({ label, count, n }) => `${label} ${n ? `${count}/${n}` : '(sem notas válidas)'}`).join(' · ');
  const [, , , justice, satisfaction] = scoreTests;
  function conclusion(t) {
    if (!t.n) return t.label + ' · sem respostas válidas.';
    const decision = t.adjusted > .05 ? 'diferença de 50% inconclusiva' : t.estimate > .5 ? 'maioria favorável' : 'minoria favorável';
    return t.label + ' · ' + t.count + '/' + t.n + ', ' + decision + '.';
  }
  function interpret(test) {
    if (!test.n) return test.label + ': sem respostas válidas para interpretar.';
    const observed = test.estimate > .5 ? 'mais da metade' : test.estimate < .5 ? 'menos da metade' : 'metade';
    const evidence = test.adjusted > .05
      ? 'O teste não trouxe evidência suficiente de diferença em relação a 50%. Isso não prova igualdade: o resultado é inconclusivo.'
      : `O teste indica uma proporção ${test.estimate > .5 ? 'superior' : 'inferior'} a 50%, mesmo após o ajuste para múltiplos testes.`;
    return test.label + ': ' + observed + ' dos registros válidos apresentou a resposta favorável. ' + evidence;
  }
  const complete = answers.map(a => ['clareza', 'priorizacao', 'melhorias'].map(k => ratingValue(a[k]))).filter(v => v.every(Boolean));
  function spread(values) {
    const mean = values.reduce((a,b) => a+b,0) / values.length;
    return values.reduce((sum,v) => sum + (v-mean)**2,0);
  }
  const totalSpread = spread(complete.map(v => v[0]+v[1]+v[2]));
  const alpha = totalSpread && complete.length > 1 ? 1.5 * (1 - [0,1,2].reduce((sum,i) => sum + spread(complete.map(v => v[i])),0) / totalSpread) : null;
  return [
    {
      label: 'Abertura', title: 'Aplicação de métricas para desempenho de desenvolvedores',
      members: ['Isabella Luiza Dias dos Santos', 'Leandro Alencar Pereira Clemente', 'Maria Clara Gomes', 'Vinícius Simões'],
      intro: 'Uma pesquisa sobre o uso de indicadores na avaliação de desempenho e a experiência de quem é avaliado.',
      items: [['Participações', String(rows.length)], ['Método', 'Questionário descritivo']],
    },
    {
      label: 'Contexto', title: 'Métricas no cotidiano das equipes de software',
      intro: 'O estudo reúne as perspectivas de profissionais que vivenciam a avaliação de desempenho no trabalho.',
      items: [['Público-alvo', 'Desenvolvedores'], ['Coleta', 'Questionário divulgado por conveniência e bola de neve'], ['Análise', 'Respostas fechadas e relatos sobre a experiência de avaliação']],
    },
    {
      label: 'Problema', title: 'O que os indicadores dizem sobre a avaliação?',
      intro: 'Queríamos entender como as métricas são usadas e que significado elas têm para quem participa da avaliação.',
      items: [['Práticas', 'Quais indicadores são usados e como os critérios chegam à equipe'], ['Utilidade', 'Como as informações ajudam na rotina de trabalho'], ['Experiência', 'Como os profissionais percebem a justiça e a satisfação com o processo']],
    },
    {
      label: 'Questões', title: 'Três questões de pesquisa', layout: 'questions',
      intro: 'As perguntas foram organizadas a partir do objetivo do estudo, seguindo a abordagem GQM.',
      items: [
        ['RQ1 · Uso de métricas', 'Como as métricas são usadas na avaliação de desempenho, segundo desenvolvedores?'],
        ['RQ2 · Utilidade', 'Que utilidade esses profissionais atribuem às informações da avaliação no cotidiano de trabalho?'],
        ['RQ3 · Justiça e satisfação', 'Como eles avaliam a justiça do processo, quão satisfeitos estão e que razões apresentam para essas percepções?']
      ],
    },
    {
      label: 'Questionário', title: 'O que perguntamos aos participantes', layout: 'questionnaire',
      intro: 'Veja como as questões de pesquisa viraram perguntas no formulário.',
      groups: questionnaireGroups.map(({ label, format, ids }) => ({
        label, format, questions: ids.map(id => fields.get(id)).filter(Boolean)
      })).filter(group => group.questions.length),
    },
    {
      label: 'Análise estatística', title: 'Abrindo o baú dos dados', layout: 'data-map',
      nodes: [
        { label: 'Perfil', detail: 'Registros por setor informado', items: [...countCategories(answers, 'setor'), ['Total', answers.length]] },
        { label: 'Indicadores', detail: 'A empresa usa indicadores?', items: countCategories(answers, 'uso') },
        { label: 'Notas', detail: '“Não sei informar” inclui “Não se aplica”.', items: ratingFields.map(([key, label]) => {
          const rated = ratingValues(answers, key).length;
          const unknown = answers.filter(answer => ['Não sei informar', 'Não se aplica'].includes(answer[key])).length;
          const unrecorded = answers.length - rated - unknown;
          return [label, rated, [
            ['Não sei informar', unknown],
            ['Sem nota registrada', unrecorded]
          ].filter(([, count]) => count > 0)];
        }) }
      ],
    },
    {
      label: 'Resultados · RQ1', title: 'Como as métricas são usadas?', layout: 'results',
      testTitle: 'Como as métricas são usadas na avaliação de desempenho, segundo desenvolvedores?',
      testNote: 'Testes exploratórios. Adoção: total de registros, com “Não sei informar” como uso não confirmado. Frequência: diária a anual conta como definida; sem frequência ou sem avaliação conta como não definida. Ferramentas: ao menos uma opção concreta (incluindo “Outra”) versus “Nenhuma”. Nos dois novos testes, respostas sem informação são excluídas. Os testes avaliam esses agrupamentos, não diferenças entre todas as categorias.',
      intro: `${used} de ${answers.length} registros relatam uso estruturado ou pontual.`,
      result: {
        source: 'collected',
        hypotheses: [adoptionTest, frequencyTest, toolsTest],
        bars: [
          { title: 'Adoção de indicadores', values: adoption },
          { title: 'Frequência de avaliação', values: orderedFrequencies.map(label => [label, frequencies.find(([value]) => value === label)[1]]) },
          { title: 'Ferramentas marcadas', values: [...toolCounts].sort((a, b) => b[1] - a[1]), note: 'Cada pessoa podia marcar várias ferramentas.' }
        ],
        themes: 'Os relatos citaram lead time, cycle time, burndown e tarefas concluídas. O feedback apareceu em reuniões, conversas individuais e revisões de código.'
      },
    },
    {
      label: 'Resultados · RQ1', title: 'Quantos indicadores e quanto tempo?', layout: 'results',
      intro: 'Os gráficos usam os valores numéricos disponíveis.',
      result: { source: 'collected', numeric: numericSummaries },
    },
    {
      label: 'Resultados · RQ2', title: 'Para que os indicadores ajudam no trabalho?', layout: 'results',
      testTitle: 'Em quais usos as notas favoráveis são maioria?',
      intro: `Notas 4 ou 5 entre as válidas. ${highScores(scoreTests.slice(0, 3))}.`,
      result: {
        source: 'collected', hypotheses: scoreTests.slice(0, 3), ratings: useful, scale: '1 = nada útil · 5 = muito útil',
        themes: 'Os relatos citaram priorizar bugs, distribuir tarefas e entender a complexidade do trabalho. Também apareceu a dificuldade de agir quando o feedback é vago.'
      },
    },
    {
      label: 'Resultados · RQ3', title: 'Como o processo foi avaliado?', layout: 'results',
      testTitle: 'As avaliações favoráveis são maioria?',
      intro: `Notas 4 ou 5 entre as válidas. ${highScores(scoreTests.slice(3))}. ${paired} de ${answers.length} registros têm as duas notas.`,
      result: {
        source: 'collected', hypotheses: scoreTests.slice(3), pairs, ratings: ratingFields.slice(3).map(([k,l]) => ratings(k,l)),
        themes: 'Critérios claros e feedback concreto foram valorizados. Entre as ressalvas, apareceu a dificuldade de captar a complexidade do trabalho apenas pela contagem de tarefas.'
      },
    },
    {
      label: 'Confiabilidade', title: 'Consistência dos itens de utilidade', layout: 'summary',
      items: [
        ['Alfa de Cronbach · cálculo', (alpha === null ? 'Indisponível neste segmento.' : 'Resultado: ' + number.format(alpha)) + '\nα = k/(k − 1) × [1 − ΣVar(item)/Var(total)]'],
        ['O que mede?', 'Mede a consistência interna: quanto as respostas às perguntas de uma mesma escala variam juntas. Aqui, avalia a coerência das perguntas sobre utilidade das métricas.'],
        ['Como interpretar?', alpha === null ? 'Não há dados suficientes ou variação para interpretar o alfa neste segmento.' : (alpha >= 0.7 ? 'O resultado está acima da referência usual de 0,70 e sugere consistência interna aceitável nesta análise exploratória.' : 'O resultado está abaixo da referência usual de 0,70 e sugere revisar a coerência das perguntas.') + ' Esse limite é uma referência, e o alfa sozinho não comprova que a escala mede o que pretende.']
      ]
    },
    {
      label: '', title: 'Metodologia e desvios', layout: 'methodology',
      items: [['Conjunto de dados', '', undefined, { analyzed: 31, target: 50 }], ['Pré-teste', 'Realizamos o pré-teste com colegas de trabalho. A principal mudança foi a forma de pedir algumas informações. Quando havia opções de resposta definidas, substituímos campos de texto livre por opções que a pessoa podia marcar.']]
    },
    {
      label: 'Fechamento', title: 'Melhorias para futuras aplicações', layout: 'summary',
      intro: 'Concluímos que uma próxima aplicação deve ampliar a participação e aprimorar o questionário.',
      items: [
        ['Mais participantes', 'Ampliar o número de desenvolvedores participantes para obter estimativas mais precisas e fortalecer a análise dos resultados.'],
        ['Perguntas mais diretas', 'Revisar o questionário com perguntas mais objetivas, claras e diretamente ligadas a cada questão de pesquisa.'],
        ['Consistência das escalas', 'Buscar maior coerência entre as perguntas de cada construto e reavaliar o alfa de Cronbach após um novo pré-teste. Perguntas mais claras podem ajudar, mas não garantem aumento do alfa.']
      ],
    }
  ].flatMap((slide, index, slides) => {
    // Os dados complementares da RQ1 entram antes da hipótese dessa RQ.
    if (slide.result?.numeric) return [];
    if (!slide.testTitle) return [slide];
    const { testTitle, testNote, result: { hypotheses, ...result }, ...descriptive } = slide;
    const rq = slide.label.match(/RQ\d/)[0];
    const evidence = rq === 'RQ1' ? 'uso estruturado ou pontual' : 'notas favoráveis (4 ou 5)';
    return [
      { ...descriptive, label: 'Dados · ' + rq, result },
      {
        label: 'Hipótese · ' + rq, title: testTitle,
        intro: rq === 'RQ1' ? 'Adoção, frequência de avaliação e ferramentas: selecione o indicador para ver sua hipótese e seu resultado.' : `H₀: a proporção de ${evidence} é 50%. H₁: essa proporção é diferente de 50%.`,
        layout: 'hypotheses', hypotheses, testNote
      },
    ];
  });
}
