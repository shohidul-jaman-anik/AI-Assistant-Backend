const aiEndpoints = [
  {
    title: 'Llama3-8b-8192',
    enabled: true,
    default: true,
    history: '/groq/get-response-from-db/',
    delete: '/groq/delete-all-response-from-db/',
  },
  {
    title: 'Gemini-1.5-flash',
    enabled: true,
    default: false,
    history: '/groq/get-response-from-db/',
    delete: '/groq/delete-all-response-from-db/',
  },
  {
    title: 'Deepseek-r1-distill-qwen-32b',
    enabled: true,
    default: false,
    history: '/groq/get-response-from-db/',
    delete: '/groq/delete-all-response-from-db/',
  },
  {
    title: 'Qwen-2.5-coder-32b',
    enabled: true,
    default: false,
    history: '/groq/get-response-from-db/',
    delete: '/groq/delete-all-response-from-db/',
  },
  {
    title: 'Qween-QWQ-32b',
    enabled: true,
    default: false,
    history: '/groq/get-response-from-db/',
    delete: '/groq/delete-all-response-from-db/',
  },
];

export default aiEndpoints;
