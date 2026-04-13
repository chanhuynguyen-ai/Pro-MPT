export type RepositoryVersion = {
  version: string;
  changelog: string;
  updatedAt: string;
  systemPrompt: string;
  userTemplate: string;
  variables: string[];
  outputFormat: string;
  notes: string;
};

export type Repository = {
  id: string;
  owner: string;
  ownerDisplayName: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'private';
  stars: number;
  clones: number;
  downloads: number;
  updatedAt: string;
  versions: RepositoryVersion[];
};

export const repositories: Repository[] = [
  {
    id: 'repo_1',
    owner: 'alina',
    ownerDisplayName: 'Alina Tran',
    name: 'teacher-assistant-vn',
    slug: 'teacher-assistant-vn',
    description: 'Prompt skill cho trợ lý dạy học tiếng Việt với giọng điệu rõ ràng, có ví dụ và cấu trúc đầu ra ổn định.',
    category: 'Education',
    tags: ['teaching', 'vietnamese', 'lesson-plan', 'kids'],
    visibility: 'public',
    stars: 128,
    clones: 41,
    downloads: 85,
    updatedAt: '2026-04-10',
    versions: [
      {
        version: '1.1.0',
        changelog: 'Bổ sung hướng dẫn tạo bài tập và rubric chấm điểm.',
        updatedAt: '2026-04-10',
        systemPrompt: 'You are a supportive Vietnamese teaching assistant. Explain clearly, age-appropriately, and structure outputs with learning goals, examples, and practice tasks.',
        userTemplate: 'Create a lesson for {{topic}} aimed at {{audience}}. Tone: {{tone}}. Duration: {{duration}} minutes.',
        variables: ['topic', 'audience', 'tone', 'duration'],
        outputFormat: 'Markdown with sections: Objectives, Explanation, Example, Practice, Homework.',
        notes: 'Designed for grade-school teachers and tutoring workflows.',
      },
      {
        version: '1.0.0',
        changelog: 'Initial public release.',
        updatedAt: '2026-03-28',
        systemPrompt: 'You are a Vietnamese teaching assistant that writes concise and friendly lessons for children.',
        userTemplate: 'Create a short lesson about {{topic}} for {{audience}}.',
        variables: ['topic', 'audience'],
        outputFormat: 'Markdown.',
        notes: 'Starter version.',
      },
    ],
  },
  {
    id: 'repo_2',
    owner: 'hungdev',
    ownerDisplayName: 'Hung Nguyen',
    name: 'api-architect',
    slug: 'api-architect',
    description: 'Prompt skill cho thiết kế backend, API contracts, task breakdown và chuẩn repo theo hơi hướng GitHub issues.',
    category: 'Development',
    tags: ['backend', 'api', 'nodejs', 'architecture'],
    visibility: 'public',
    stars: 264,
    clones: 93,
    downloads: 167,
    updatedAt: '2026-04-11',
    versions: [
      {
        version: '2.0.0',
        changelog: 'Tái cấu trúc output thành Architecture, Endpoints, Risks, Delivery Plan.',
        updatedAt: '2026-04-11',
        systemPrompt: 'You are a senior backend architect. Respond like a practical tech lead. Optimize for maintainability, clarity, and incremental delivery.',
        userTemplate: 'Design an API for {{product}} using {{stack}}. Constraints: {{constraints}}. Deadline: {{deadline}}.',
        variables: ['product', 'stack', 'constraints', 'deadline'],
        outputFormat: 'Markdown with sections and API tables.',
        notes: 'Works well for internal planning and project kickoffs.',
      },
      {
        version: '1.3.0',
        changelog: 'Added edge case and validation rules.',
        updatedAt: '2026-04-05',
        systemPrompt: 'You are a senior backend engineer specializing in REST APIs and scalable systems.',
        userTemplate: 'Design API endpoints and project structure for {{product}} in {{stack}}.',
        variables: ['product', 'stack'],
        outputFormat: 'Markdown.',
        notes: 'Earlier stable version.',
      },
    ],
  },
  {
    id: 'repo_3',
    owner: 'chefminh',
    ownerDisplayName: 'Minh Le',
    name: 'meal-planner-fast',
    slug: 'meal-planner-fast',
    description: 'Bộ prompt hỗ trợ lên thực đơn, gợi ý nguyên liệu thay thế và tối ưu thời gian nấu ăn.',
    category: 'Cooking',
    tags: ['meal-plan', 'cooking', 'budget', 'healthy'],
    visibility: 'public',
    stars: 76,
    clones: 20,
    downloads: 38,
    updatedAt: '2026-04-09',
    versions: [
      {
        version: '1.0.2',
        changelog: 'Tinh chỉnh output rõ nguyên liệu và thời gian hơn.',
        updatedAt: '2026-04-09',
        systemPrompt: 'You are a practical home cooking assistant focused on speed, affordability, and clear steps.',
        userTemplate: 'Create a meal plan for {{people}} people with {{budget}} budget and {{time_limit}} minutes max.',
        variables: ['people', 'budget', 'time_limit'],
        outputFormat: 'Markdown bullet list plus shopping list.',
        notes: 'Great for short-form planning and daily cooking.',
      },
    ],
  },
];

export const categories = ['All', 'Development', 'Education', 'Cooking', 'Marketing', 'Customer Support'];

export function getRepository(owner: string, slug: string) {
  return repositories.find((repo) => repo.owner === owner && repo.slug === slug);
}
