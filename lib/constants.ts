export const CATEGORY_OPTIONS = [
  'Development',
  'Education',
  'Cooking',
  'Marketing',
  'Customer Support',
] as const;

export const SUPPORTED_MODEL_OPTIONS = [
  'All models',
  'ChatGPT',
  'Claude',
  'Claude Code',
  'Gemini',
] as const;

export const REPOSITORY_SOURCE_MODES = [
  { value: 'MANUAL', label: 'Write prompts on the web', description: 'Create and store the prompt directly inside Prompt-Hub.' },
  { value: 'UPLOAD_BUNDLE', label: 'Upload files or folder bundle', description: 'Upload a prompt pack, skill folder, notes, docs, or a zipped bundle from your computer.' },
] as const;

export type SupportedModelLabel = (typeof SUPPORTED_MODEL_OPTIONS)[number];

export const COMPATIBILITY_LABEL_TO_ENUM = {
  'All models': 'ALL_MODELS',
  ChatGPT: 'CHATGPT',
  Claude: 'CLAUDE',
  'Claude Code': 'CLAUDE_CODE',
  Gemini: 'GEMINI',
} as const;

export const COMPATIBILITY_ENUM_TO_LABEL = {
  ALL_MODELS: 'All models',
  CHATGPT: 'ChatGPT',
  CLAUDE: 'Claude',
  CLAUDE_CODE: 'Claude Code',
  GEMINI: 'Gemini',
} as const;

export const REPOSITORY_SOURCE_MODE_TO_LABEL = {
  MANUAL: 'Web prompt',
  UPLOAD_BUNDLE: 'Uploaded bundle',
} as const;

export const TEXT_PREVIEW_EXTENSIONS = [
  '.txt',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.sh',
  '.sql',
  '.html',
  '.css',
  '.xml',
  '.env',
  '.toml',
  '.ini',
  '.cfg',
  '.prisma',
] as const;

export const MAX_UPLOAD_FILES = 100;
export const MAX_TOTAL_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_TEXT_PREVIEW_BYTES = 20 * 1024;
