/**
 * Supported Live2D expressions
 */

export const SUPPORTED_EXPRESSIONS = [
  'angry',      // 生气
  'cat pupil',  // 猫瞳（开心）
  'cry',        // 哭泣
  'expl',       // 惊讶
  'eye glow',   // 眼睛发光（神秘）
  'fluffy',     // 毛茸茸（撒娇）
  'knife',      // 调皮威胁
  'long',       // 拉伸
  'no pupil',   // 无瞳（空洞）
  'question',   // 疑问
  'sad',        // 难过
] as const;

export type SupportedExpression = typeof SUPPORTED_EXPRESSIONS[number];

/**
 * Check if a string is a valid expression name
 */
export function isValidExpression(expr: string): expr is SupportedExpression {
  return SUPPORTED_EXPRESSIONS.includes(expr as SupportedExpression);
}

/**
 * Expression descriptions for prompting
 */
export const EXPRESSION_DESCRIPTIONS: Record<SupportedExpression, string> = {
  'angry': '生气',
  'cat pupil': '开心/喜欢',
  'cry': '想哭/委屈',
  'expl': '惊讶',
  'eye glow': '神秘/魔法',
  'fluffy': '撒娇/可爱',
  'knife': '调皮威胁/开玩笑',
  'long': '拉伸/懒洋洋',
  'no pupil': '空洞/无精打采',
  'question': '疑问/好奇',
  'sad': '难过/伤心',
};
