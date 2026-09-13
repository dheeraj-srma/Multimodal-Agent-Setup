import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

let mainWindow: BrowserWindow | null = null;
const ACC_DATA_DIR = path.join(app.getPath('userData'), 'acc-data');

function ensureDataDir() {
  if (!fs.existsSync(ACC_DATA_DIR)) {
    fs.mkdirSync(ACC_DATA_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#080c14',
    title: 'Agent Command Center — Swarm Intelligence HUD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow?.loadFile(indexPath);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register IPC Handlers
function setupIpcHandlers() {
  ensureDataDir();

  // Storage persistence
  ipcMain.handle('acc:saveStore', async (_, data) => {
    try {
      const filePath = path.join(ACC_DATA_DIR, 'state.json');
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('acc:loadStore', async () => {
    try {
      const filePath = path.join(ACC_DATA_DIR, 'state.json');
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[IPC] Could not read state.json:', err);
    }
    return null;
  });

  // Git status integration
  ipcMain.handle('acc:getGitStatus', async () => {
    const cwd = process.cwd();
    try {
      // Check branch
      const branchCmd = await execAsync('git branch --show-current', { cwd }).catch(() => ({ stdout: 'main' }));
      const branch = branchCmd.stdout.trim() || 'main';

      // Status porcelain
      const statusCmd = await execAsync('git status --porcelain', { cwd }).catch(() => ({ stdout: '' }));
      const lines = statusCmd.stdout.trim().split('\n').filter(Boolean);

      const modifiedFiles: string[] = [];
      const addedFiles: string[] = [];
      const deletedFiles: string[] = [];
      const untrackedFiles: string[] = [];

      for (const line of lines) {
        const code = line.slice(0, 2);
        const file = line.slice(3).trim();
        if (code.includes('M')) modifiedFiles.push(file);
        else if (code.includes('A')) addedFiles.push(file);
        else if (code.includes('D')) deletedFiles.push(file);
        else if (code.includes('?')) untrackedFiles.push(file);
      }

      // Recent commits
      const logCmd = await execAsync('git log -n 5 --pretty=format:"%h|%s|%an|%ad" --date=short', { cwd }).catch(
        () => ({ stdout: '' })
      );
      const recentCommits = logCmd.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line: string) => {
          const [hash, message, author, date] = line.split('|');
          return { hash, message, author, date };
        });

      return {
        isGitRepo: true,
        currentBranch: branch,
        trackingBranch: `origin/${branch}`,
        modifiedFiles,
        addedFiles,
        deletedFiles,
        untrackedFiles,
        aheadCount: 0,
        behindCount: 0,
        recentCommits,
      };
    } catch (err: any) {
      return {
        isGitRepo: false,
        currentBranch: 'main',
        modifiedFiles: [],
        addedFiles: [],
        deletedFiles: [],
        untrackedFiles: [],
        aheadCount: 0,
        behindCount: 0,
        recentCommits: [],
      };
    }
  });

  // Git diff
  ipcMain.handle('acc:getGitDiff', async (_, filePath) => {
    const cwd = process.cwd();
    try {
      const fileArg = filePath ? ` -- "${filePath}"` : '';
      const diffCmd = await execAsync(`git diff${fileArg}`, { cwd }).catch(() => ({ stdout: '' }));
      return diffCmd.stdout || '# No unstaged diff';
    } catch (err: any) {
      return `# Git diff error: ${err.message}`;
    }
  });

  // Git commit
  ipcMain.handle('acc:gitCommit', async (_, { message, files }: { message: string; files?: string[] }) => {
    const cwd = process.cwd();
    try {
      const addArg = files && files.length > 0 ? files.map((f) => `"${f}"`).join(' ') : '.';
      await execAsync(`git add ${addArg}`, { cwd });
      const commitRes = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd });
      return { success: true, stdout: commitRes.stdout };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Read file from workspace
  ipcMain.handle('acc:readFile', async (_, relativePath: string) => {
    try {
      const fullPath = path.resolve(process.cwd(), relativePath);
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Write file to workspace
  ipcMain.handle('acc:writeFile', async (_, { relativePath, content }: { relativePath: string; content: string }) => {
    try {
      const fullPath = path.resolve(process.cwd(), relativePath);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, content, 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
