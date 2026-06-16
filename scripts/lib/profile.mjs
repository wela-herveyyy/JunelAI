import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

export const PROFILE_DIR = join(homedir(), '.erpnext-mcp');
export const DEFAULT_PROFILE_FILE = join(PROFILE_DIR, 'user-profile.json');
export const MEMORY_LANE_PROFILE = join(
  REPO_ROOT,
  '.cursor',
  'memory-lane',
  'user-profile.md'
);

const EMPTY_PROFILE = {
  fullName: '',
  position: '',
  workEmail: '',
  company: '',
  department: '',
  erpnextUser: '',
  employeeId: '',
  employeeName: '',
  timezone: '',
  dateFormat: 'YYYY-MM-DD',
  notes: '',
  _meta: { updatedAt: '' },
};

export function resolveProfilePath() {
  return process.env.ERPNEXT_PROFILE_FILE || DEFAULT_PROFILE_FILE;
}

export async function loadProfile() {
  const path = resolveProfilePath();
  try {
    const raw = await readFile(path, 'utf8');
    const data = JSON.parse(raw);
    return { path, profile: { ...EMPTY_PROFILE, ...data, _meta: { ...EMPTY_PROFILE._meta, ...data._meta } } };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { path, profile: { ...EMPTY_PROFILE } };
    }
    throw error;
  }
}

export async function saveProfile(profile) {
  const path = resolveProfilePath();
  await mkdir(PROFILE_DIR, { recursive: true });
  const payload = {
    ...profile,
    _meta: {
      ...profile._meta,
      updatedAt: new Date().toISOString(),
    },
  };
  await writeFile(path, JSON.stringify(payload, null, 2), { mode: 0o600 });
  return path;
}

const IDENTITY_ROWS = [
  ['Full name', 'fullName'],
  ['Position', 'position'],
  ['Work email', 'workEmail'],
  ['Company', 'company'],
  ['Department', 'department'],
];

export async function syncMemoryLaneMarkdown(profile) {
  const today = new Date().toISOString().slice(0, 10);
  let md;

  try {
    md = await readFile(MEMORY_LANE_PROFILE, 'utf8');
  } catch {
    md = await readFile(join(REPO_ROOT, '.cursor', 'memory-lane', 'user-profile.example.md'), 'utf8');
    md = md.replace(
      '> Copy this file to `user-profile.md`',
      '> MCP source: `~/.erpnext-mcp/user-profile.json`'
    );
  }

  for (const [label, key] of IDENTITY_ROWS) {
    const value = profile[key] || '';
    const pattern = new RegExp(`(\\| ${label} \\| )[^|]*( \\|)`, 'm');
    md = md.replace(pattern, `$1${value}$2`);
  }

  if (/\*Last updated:.*\*/.test(md)) {
    md = md.replace(/\*Last updated:.*\*/, `*Last updated: ${today}*`);
  } else {
    md += `\n*Last updated: ${today}*\n`;
  }

  await mkdir(dirname(MEMORY_LANE_PROFILE), { recursive: true });
  await writeFile(MEMORY_LANE_PROFILE, md, 'utf8');
  return MEMORY_LANE_PROFILE;
}

export async function askField(rl, label, current = '') {
  const hint = current ? ` [${current}]` : '';
  const answer = (await rl.question(`${label}${hint}: `)).trim();
  return answer || current || '';
}

export function parseProfileArgs(argv) {
  const args = {
    fullName: '',
    position: '',
    workEmail: '',
    company: '',
    department: '',
    json: false,
    yes: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if ((arg === '--full-name' || arg === '--fullName') && argv[i + 1]) {
      args.fullName = argv[++i];
    } else if (arg === '--position' && argv[i + 1]) {
      args.position = argv[++i];
    } else if ((arg === '--work-email' || arg === '--workEmail') && argv[i + 1]) {
      args.workEmail = argv[++i];
    } else if (arg === '--company' && argv[i + 1]) {
      args.company = argv[++i];
    } else if (arg === '--department' && argv[i + 1]) {
      args.department = argv[++i];
    }
  }

  return args;
}

export function hasCliProfileInput(args) {
  return Boolean(
    args.fullName || args.position || args.workEmail || args.company || args.department
  );
}

export function mergeIdentityFields(existing, input) {
  const profile = { ...existing };
  for (const key of ['fullName', 'position', 'workEmail', 'company', 'department']) {
    if (input[key]) {
      profile[key] = input[key];
    }
  }
  return profile;
}

export async function writeProfile(profile, { json = false } = {}) {
  const jsonPath = await saveProfile(profile);
  const mdPath = await syncMemoryLaneMarkdown(profile);
  const result = { status: 'success', jsonPath, mdPath, profile };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nProfile saved.');
    console.log(`  MCP:         ${jsonPath}`);
    console.log(`  Memory Lane: ${mdPath}`);
    console.log('\nRestart the MCP server or call get_user_profile to load in chat.\n');
  }

  return result;
}
