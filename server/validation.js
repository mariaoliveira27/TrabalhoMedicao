export function validateResponse(body, questionnaire) {
  const errors = {};
  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
  const name = clean(body.name, 160);
  const company = clean(body.company, 200);
  if (!name || name.length > 160) errors.name = 'Informe seu nome (até 160 caracteres).';
  if (!company || company.length > 200) errors.company = 'Informe a empresa (até 200 caracteres).';
  if (body.consent !== true) errors.consent = 'Confirme a participação para enviar.';
  if (body.version !== questionnaire.version) errors.version = 'O questionário foi atualizado. Recarregue a página.';
  const answers = {};
  for (const question of questionnaire.sections.flatMap(s => s.questions)) {
    const value = body.answers?.[question.id];
    if (question.type === 'number') {
      const empty = value === '' || value === undefined || value === null;
      const number = empty ? null : (typeof value === 'number' || typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
      if (empty && question.required || !empty && (!Number.isFinite(number) || number < question.min || number > question.max || question.integer && !Number.isInteger(number))) errors[question.id] = `Informe um número ${question.integer ? 'inteiro ' : ''}entre ${question.min} e ${question.max}.`;
      answers[question.id] = number;
    } else if (question.type === 'multiselect') {
      const values = Array.isArray(value) ? [...new Set(value)] : [];
      if (question.required && !values.length || values.some(v => !question.options.includes(v))) errors[question.id] = 'Selecione uma opção válida.';
      if (values.includes('Nenhuma') && values.length > 1) errors[question.id] = 'Selecione “Nenhuma” sozinha ou escolha as ferramentas utilizadas.';
      answers[question.id] = values;
    } else if (question.type === 'select') {
      if (question.required && !value || value && !question.options.includes(value)) errors[question.id] = 'Selecione uma opção válida.';
      answers[question.id] = value || '';
    } else {
      const text = clean(value, question.maxLength || 2000);
      if (question.required && !text || text.length > (question.maxLength || 2000)) errors[question.id] = 'Preencha este campo dentro do limite indicado.';
      answers[question.id] = text;
    }
  }
  return { errors, value: { name, company, answers } };
}

export function csvCell(value) {
  let text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  if (/^[\s]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
