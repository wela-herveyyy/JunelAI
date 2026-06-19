import { cp, mkdir, readdir, realpath, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @typedef {'workspace' | 'user'} SkillScope */

/**
 * @typedef {Object} SkillClient
 * @property {string} id
 * @property {string} name
 * @property {(scope: SkillScope) => string} skillsDir
 * @property {(scope: SkillScope) => string} memoryLaneDir
 */

/** @type {SkillClient[]} */
export const SKILL_CLIENTS = [
  {
    id: 'cursor',
    name: 'Cursor',
    skillsDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.cursor', 'skills')
        : join(REPO_ROOT, '.cursor', 'skills'),
    memoryLaneDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.cursor', 'memory-lane')
        : join(REPO_ROOT, '.cursor', 'memory-lane'),
  },
  {
    id: 'claude',
    name: 'Claude Desktop / Claude Code',
    skillsDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.claude', 'skills')
        : join(REPO_ROOT, '.claude', 'skills'),
    memoryLaneDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.claude', 'memory-lane')
        : join(REPO_ROOT, '.claude', 'memory-lane'),
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    skillsDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.gemini', 'skills')
        : join(REPO_ROOT, '.gemini', 'skills'),
    memoryLaneDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.gemini', 'memory-lane')
        : join(REPO_ROOT, '.gemini', 'memory-lane'),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    skillsDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.config', 'opencode', 'skills')
        : join(REPO_ROOT, '.opencode', 'skills'),
    memoryLaneDir: (scope) =>
      scope === 'user'
        ? join(homedir(), '.config', 'opencode', 'memory-lane')
        : join(REPO_ROOT, '.opencode', 'memory-lane'),
  },
];

export const SOURCE_SKILLS_DIR = join(REPO_ROOT, '.cursor', 'skills');
export const SOURCE_MEMORY_LANE_DIR = join(REPO_ROOT, '.cursor', 'memory-lane');

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function replaceDir(from, to) {
  if (await pathExists(to)) {
    await rm(to, { recursive: true, force: true });
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
}

/**
 * @param {SkillClient} client
 * @param {SkillScope} scope
 */
export async function installSkillsForClient(client, scope = 'workspace') {
  const targetSkills = client.skillsDir(scope);
  const targetMemory = client.memoryLaneDir(scope);
  let sourceSkillsResolved = SOURCE_SKILLS_DIR;
  let targetSkillsResolved = null;
  try {
    sourceSkillsResolved = await realpath(SOURCE_SKILLS_DIR);
  } catch {
    /* source must exist */
  }
  try {
    targetSkillsResolved = await realpath(targetSkills);
  } catch {
    /* target may not exist yet */
  }

  const skillsCopied = [];
  if (targetSkillsResolved && sourceSkillsResolved === targetSkillsResolved) {
    skillsCopied.push('(source — already in .cursor/skills)');
  } else {
    await replaceDir(SOURCE_SKILLS_DIR, targetSkills);
    const entries = await readdir(targetSkills, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) skillsCopied.push(entry.name);
    }
  }

  let memoryLaneNote = 'copied';
  let sourceMemoryResolved = SOURCE_MEMORY_LANE_DIR;
  let targetMemoryResolved = null;
  try {
    sourceMemoryResolved = await realpath(SOURCE_MEMORY_LANE_DIR);
  } catch {
    /* validated in installSkills */
  }
  try {
    targetMemoryResolved = await realpath(targetMemory);
  } catch {
    /* target may not exist yet */
  }

  if (targetMemoryResolved && sourceMemoryResolved === targetMemoryResolved) {
    memoryLaneNote = '(source — already in .cursor/memory-lane)';
  } else {
    await replaceDir(SOURCE_MEMORY_LANE_DIR, targetMemory);
  }

  return {
    client: client.id,
    name: client.name,
    scope,
    skillsDir: targetSkills,
    memoryLaneDir: targetMemory,
    memoryLaneNote,
    skills: skillsCopied,
  };
}

/**
 * @param {Object} options
 * @param {SkillScope} [options.scope]
 * @param {string[]} [options.clients]
 */
export async function installSkills(options = {}) {
  const scope = options.scope ?? 'workspace';
  const requested = options.clients?.length
    ? options.clients
    : SKILL_CLIENTS.map((c) => c.id);

  if (!(await pathExists(SOURCE_SKILLS_DIR))) {
    throw new Error(`Missing ${SOURCE_SKILLS_DIR} — clone the repo or restore .cursor/skills/`);
  }
  if (!(await pathExists(SOURCE_MEMORY_LANE_DIR))) {
    throw new Error(
      `Missing ${SOURCE_MEMORY_LANE_DIR} — run: git restore .cursor/memory-lane`
    );
  }

  const unknown = requested.filter((id) => !SKILL_CLIENTS.some((c) => c.id === id));
  if (unknown.length) {
    throw new Error(`Unknown client(s): ${unknown.join(', ')}`);
  }

  const results = [];
  for (const id of requested) {
    const client = SKILL_CLIENTS.find((c) => c.id === id);
    if (client) {
      results.push(await installSkillsForClient(client, scope));
    }
  }
  return results;
}

export function printInstallResults(results) {
  console.log('\n=== ERPNext skills installed ===\n');
  for (const result of results) {
    console.log(`${result.name} (${result.scope})`);
    console.log(`  Skills:  ${result.skillsDir}`);
    console.log(`  Memory:  ${result.memoryLaneDir}${result.memoryLaneNote ? ` ${result.memoryLaneNote}` : ''}`);
    console.log(`  Bundles: ${result.skills.join(', ')}`);
    console.log('');
  }
  console.log('Restart your AI client (or reload the window) to pick up skills.');
  console.log('Source: .cursor/skills/ and .cursor/memory-lane/\n');
}
