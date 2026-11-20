export function isQuestionVisible(question, answers) {
  return !question.showWhen || question.showWhen.values.includes(answers?.[question.showWhen.question]);
}
