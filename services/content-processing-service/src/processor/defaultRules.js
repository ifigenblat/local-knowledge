/**
 * Default processing rules - used when DB is empty or for "Reset to defaults"
 * Must match structure expected by contentProcessor and validation schema
 */

const DEFAULT_RULES = {
  cardTypeKeywords: {
    concept: ['concept', 'definition', 'theory', 'principle', 'framework', 'model'],
    action: [
      'action', 'actions', 'action item', 'action items',
      'step', 'steps', 'next step', 'next steps',
      'process', 'procedure', 'method', 'technique', 'strategy',
      'task', 'tasks', 'todo', 'to do', 'to-do',
      'follow up', 'follow-up', 'followup',
      'implement', 'implementation', 'execute', 'execution',
      'deliverable', 'deliverables', 'milestone', 'milestones',
      'assign', 'assignment', 'owner', 'responsible',
      'deadline', 'due date', 'timeline', 'schedule'
    ],
    quote: ['quote', 'saying', 'proverb', 'wisdom', 'insight'],
    checklist: ['checklist', 'list', 'items', 'tasks', 'requirements', 'criteria'],
    mindmap: ['relationship', 'connection', 'link', 'network', 'system']
  },
  categoryKeywords: {
    'AI': [
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network',
      'algorithm', 'automation', 'chatbot', 'gpt', 'llm', 'large language model', 'nlp',
      'natural language processing', 'computer vision', 'robotics', 'predictive analytics',
      'data science', 'intelligent', 'smart', 'automated', 'cognitive', 'intelligence'
    ],
    'Leadership': [
      'leadership', 'leader', 'vision', 'inspire', 'motivate', 'empower', 'mentor',
      'coach', 'guide', 'direct', 'influence', 'authority', 'executive', 'ceo', 'manager'
    ],
    'Management': [
      'management', 'manager', 'supervisor', 'administrator', 'director', 'head',
      'oversight', 'coordination', 'supervision', 'administration', 'governance'
    ],
    'Team Management': [
      'team', 'collaboration', 'cooperation', 'group', 'member', 'colleague',
      'partnership', 'alliance', 'unity', 'together', 'collective', 'synergy'
    ],
    'People': [
      'people', 'personnel', 'staff', 'employee', 'individual', 'human', 'person',
      'workforce', 'talent', 'colleague', 'team member', 'stakeholder', 'user'
    ],
    'Organization': [
      'organization', 'org', 'organizational', 'institution', 'company', 'corporation',
      'enterprise', 'business', 'firm', 'agency', 'department', 'division', 'unit'
    ],
    'Operating Principles': [
      'operating principles', 'principles', 'values', 'ethics', 'standards', 'guidelines',
      'policies', 'procedures', 'best practices', 'methodology', 'framework', 'approach'
    ],
    'Process': [
      'process', 'workflow', 'procedure', 'method', 'system', 'approach', 'methodology',
      'technique', 'strategy', 'tactic', 'protocol', 'routine', 'operation'
    ],
    'Architecture': [
      'architecture', 'architectural', 'design', 'structure', 'framework', 'blueprint',
      'model', 'pattern', 'layout', 'configuration', 'infrastructure', 'system design'
    ],
    'Data': [
      'data', 'information', 'analytics', 'metrics', 'statistics', 'insights', 'intelligence',
      'reporting', 'analysis', 'measurement', 'kpi', 'dashboard', 'database', 'dataset'
    ],
    'Technology': [
      'technology', 'digital', 'software', 'hardware', 'system', 'platform',
      'application', 'tool', 'automation', 'innovation', 'development',
      'implementation', 'integration', 'maintenance', 'upgrade'
    ],
    'Communication': [
      'communication', 'presentation', 'speech', 'talk', 'discussion', 'meeting',
      'conversation', 'dialogue', 'message', 'feedback', 'listen', 'speak', 'write',
      'email', 'report', 'documentation', 'storytelling', 'public speaking'
    ],
    'Strategic Planning': [
      'strategy', 'planning', 'plan', 'goal', 'objective', 'target', 'mission',
      'vision', 'roadmap', 'blueprint', 'framework', 'approach', 'methodology',
      'tactics', 'initiative', 'project', 'program'
    ],
    'Performance Management': [
      'performance', 'evaluation', 'assessment', 'review', 'feedback', 'metrics',
      'kpi', 'measurement', 'analysis', 'improvement', 'optimization', 'efficiency',
      'productivity', 'quality', 'excellence', 'achievement', 'results'
    ],
    'Change Management': [
      'change', 'transformation', 'transition', 'evolution', 'adaptation',
      'innovation', 'disruption', 'modernization', 'digitalization', 'restructure',
      'reorganization', 'improvement', 'development', 'growth'
    ],
    'Decision Making': [
      'decision', 'choice', 'option', 'alternative', 'solution', 'problem-solving',
      'analysis', 'evaluation', 'judgment', 'conclusion', 'determination',
      'resolve', 'decide', 'choose', 'select', 'prioritize'
    ],
    'Conflict Resolution': [
      'conflict', 'dispute', 'disagreement', 'resolution', 'mediation', 'negotiation',
      'compromise', 'consensus', 'agreement', 'harmony', 'reconciliation',
      'peace', 'understanding', 'tolerance', 'respect'
    ],
    'Time Management': [
      'time', 'schedule', 'deadline', 'timeline', 'prioritization', 'organization',
      'efficiency', 'productivity', 'planning', 'coordination', 'management',
      'allocation', 'optimization', 'balance', 'work-life'
    ],
    'Financial Management': [
      'finance', 'budget', 'cost', 'expense', 'revenue', 'profit', 'investment',
      'financial', 'economic', 'monetary', 'fiscal', 'accounting', 'audit',
      'forecasting', 'planning', 'analysis', 'reporting'
    ],
    'Customer Service': [
      'customer', 'client', 'service', 'support', 'satisfaction', 'experience',
      'relationship', 'engagement', 'loyalty', 'retention', 'acquisition',
      'feedback', 'complaint', 'resolution', 'excellence'
    ],
    'Marketing': [
      'marketing', 'brand', 'advertising', 'promotion', 'campaign', 'strategy',
      'market', 'customer', 'audience', 'target', 'message', 'communication',
      'social media', 'content', 'analytics', 'conversion'
    ],
    'Human Resources': [
      'hr', 'human resources', 'recruitment', 'hiring', 'training', 'development',
      'employee', 'staff', 'personnel', 'workforce', 'talent', 'culture',
      'benefits', 'compensation', 'retention', 'engagement'
    ],
    'Operations': [
      'operations', 'process', 'workflow', 'procedure', 'system', 'efficiency',
      'optimization', 'streamline', 'automation', 'quality', 'standards',
      'compliance', 'safety', 'risk', 'management'
    ],
    'Sales': [
      'sales', 'revenue', 'deal', 'prospect', 'client', 'customer', 'pitch',
      'negotiation', 'closing', 'relationship', 'pipeline', 'target',
      'quota', 'commission', 'performance', 'growth'
    ]
  },
  actionVerbs: [
    'create', 'build', 'develop', 'design', 'implement', 'deploy',
    'write', 'draft', 'prepare', 'complete', 'finish', 'finalize',
    'review', 'approve', 'submit', 'send', 'share', 'publish',
    'update', 'modify', 'change', 'fix', 'resolve', 'address',
    'schedule', 'organize', 'plan', 'coordinate', 'manage',
    'contact', 'reach out', 'follow up', 'meet', 'discuss',
    'analyze', 'evaluate', 'assess', 'investigate', 'research',
    'install', 'configure', 'setup', 'test', 'verify', 'validate'
  ]
};

module.exports = { DEFAULT_RULES };
