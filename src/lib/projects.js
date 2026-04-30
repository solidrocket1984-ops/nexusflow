export const PROJECT_CATALOG = [
  {
    id: 'maind',
    realId: '69b599c67e80030f60f34e92',
    name: 'Maind',
    color: '#7c3aed',
    aliases: ['maind', '69b599c67e80030f60f34e92'],
    description: 'Projecte Maind.',
  },
  {
    id: 'enllac_digital',
    realId: '69b599c67e80030f60f34e93',
    name: 'Enllaç Digital',
    color: '#4f46e5',
    aliases: ['enllac_digital', 'enlac_digital', '69b599c67e80030f60f34e93'],
    description: 'Projecte principal de captació i CRM comercial.',
  },
  {
    id: 'respondeya',
    realId: '69b599c67e80030f60f34e94',
    name: 'Respondeya',
    color: '#0891b2',
    aliases: ['respondeya', '69b599c67e80030f60f34e94'],
    description: 'Canal complementari de leads i seguiment.',
  },
];

const aliasIndex = PROJECT_CATALOG.reduce((acc, project) => {
  project.aliases.forEach((alias) => {
    acc[String(alias).toLowerCase()] = project.id;
  });
  return acc;
}, {});

// Maps normalizedId → realId (UUID)
const realIdIndex = PROJECT_CATALOG.reduce((acc, project) => {
  acc[project.id] = project.realId;
  return acc;
}, {});

export function normalizeProjectId(projectId) {
  if (!projectId) return 'enllac_digital';
  return aliasIndex[String(projectId).toLowerCase()] || String(projectId).toLowerCase();
}

export function getRealProjectId(projectId) {
  const normalized = normalizeProjectId(projectId);
  return realIdIndex[normalized] || projectId;
}

export function getProjectById(projectId) {
  const normalizedId = normalizeProjectId(projectId);
  return PROJECT_CATALOG.find((project) => project.id === normalizedId) || null;
}

export function getProjectName(projectId, fallback = 'Sense projecte') {
  return getProjectById(projectId)?.name || fallback;
}

export function getProjectColor(projectId, fallback = '#64748b') {
  return getProjectById(projectId)?.color || fallback;
}

export function buildProjectsFromData(items = []) {
  const found = new Set();
  const projects = [];

  items.forEach((item) => {
    const normalizedId = normalizeProjectId(item?.project_id);
    if (found.has(normalizedId)) return;
    const catalogProject = getProjectById(normalizedId);
    if (catalogProject) {
      projects.push(catalogProject);
      found.add(normalizedId);
    }
  });

  PROJECT_CATALOG.forEach((project) => {
    if (!found.has(project.id)) {
      projects.push(project);
    }
  });

  return projects;
}