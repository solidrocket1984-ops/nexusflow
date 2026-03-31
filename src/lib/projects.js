export const PROJECT_CATALOG = [
  {
    id: 'enllac_digital',
    name: 'Enllaç Digital',
    color: '#4f46e5',
    aliases: ['enllac_digital', 'enlac_digital', '69b599c67e80030f60f34e93'],
    description: 'Projecte principal de captació i CRM comercial.',
  },
  {
    id: 'respondeya',
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

export function normalizeProjectId(projectId) {
  if (!projectId) return 'enllac_digital';
  return aliasIndex[String(projectId).toLowerCase()] || String(projectId).toLowerCase();
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
