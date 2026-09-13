"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec);
let mainWindow = null;
const ACC_DATA_DIR = path_1.default.join(electron_1.app.getPath('userData'), 'acc-data');
function ensureDataDir() {
    if (!fs_1.default.existsSync(ACC_DATA_DIR)) {
        fs_1.default.mkdirSync(ACC_DATA_DIR, { recursive: true });
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1560,
        height: 980,
        minWidth: 1200,
        minHeight: 800,
        backgroundColor: '#080c14',
        title: 'Agent Command Center — Swarm Intelligence HUD',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    if (process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged) {
        mainWindow.loadURL(devUrl).catch(() => {
            const indexPath = path_1.default.join(__dirname, '../dist/index.html');
            if (fs_1.default.existsSync(indexPath)) {
                mainWindow?.loadFile(indexPath);
            }
        });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Register IPC Handlers
function setupIpcHandlers() {
    ensureDataDir();
    // Storage persistence
    electron_1.ipcMain.handle('acc:saveStore', async (_, data) => {
        try {
            const filePath = path_1.default.join(ACC_DATA_DIR, 'state.json');
            await fs_1.default.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    electron_1.ipcMain.handle('acc:loadStore', async () => {
        try {
            const filePath = path_1.default.join(ACC_DATA_DIR, 'state.json');
            if (fs_1.default.existsSync(filePath)) {
                const raw = await fs_1.default.promises.readFile(filePath, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch (err) {
            console.warn('[IPC] Could not read state.json:', err);
        }
        return null;
    });
    // Git status integration
    electron_1.ipcMain.handle('acc:getGitStatus', async () => {
        const cwd = process.cwd();
        try {
            // Check branch
            const branchCmd = await execAsync('git branch --show-current', { cwd }).catch(() => ({ stdout: 'main' }));
            const branch = branchCmd.stdout.trim() || 'main';
            // Status porcelain
            const statusCmd = await execAsync('git status --porcelain', { cwd }).catch(() => ({ stdout: '' }));
            const lines = statusCmd.stdout.trim().split('\n').filter(Boolean);
            const modifiedFiles = [];
            const addedFiles = [];
            const deletedFiles = [];
            const untrackedFiles = [];
            for (const line of lines) {
                const code = line.slice(0, 2);
                const file = line.slice(3).trim();
                if (code.includes('M'))
                    modifiedFiles.push(file);
                else if (code.includes('A'))
                    addedFiles.push(file);
                else if (code.includes('D'))
                    deletedFiles.push(file);
                else if (code.includes('?'))
                    untrackedFiles.push(file);
            }
            // Recent commits
            const logCmd = await execAsync('git log -n 5 --pretty=format:"%h|%s|%an|%ad" --date=short', { cwd }).catch(() => ({ stdout: '' }));
            const recentCommits = logCmd.stdout
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line) => {
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
        }
        catch (err) {
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
    electron_1.ipcMain.handle('acc:getGitDiff', async (_, filePath) => {
        const cwd = process.cwd();
        try {
            const fileArg = filePath ? ` -- "${filePath}"` : '';
            const diffCmd = await execAsync(`git diff${fileArg}`, { cwd }).catch(() => ({ stdout: '' }));
            return diffCmd.stdout || '# No unstaged diff';
        }
        catch (err) {
            return `# Git diff error: ${err.message}`;
        }
    });
    // Git commit
    electron_1.ipcMain.handle('acc:gitCommit', async (_, { message, files }) => {
        const cwd = process.cwd();
        try {
            const addArg = files && files.length > 0 ? files.map((f) => `"${f}"`).join(' ') : '.';
            await execAsync(`git add ${addArg}`, { cwd });
            const commitRes = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd });
            return { success: true, stdout: commitRes.stdout };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Read file from workspace
    electron_1.ipcMain.handle('acc:readFile', async (_, relativePath) => {
        try {
            const fullPath = path_1.default.resolve(process.cwd(), relativePath);
            const content = await fs_1.default.promises.readFile(fullPath, 'utf-8');
            return { success: true, content };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Write file to workspace
    electron_1.ipcMain.handle('acc:writeFile', async (_, { relativePath, content }) => {
        try {
            const fullPath = path_1.default.resolve(process.cwd(), relativePath);
            await fs_1.default.promises.mkdir(path_1.default.dirname(fullPath), { recursive: true });
            await fs_1.default.promises.writeFile(fullPath, content, 'utf-8');
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
}
electron_1.app.whenReady().then(() => {
    setupIpcHandlers();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
