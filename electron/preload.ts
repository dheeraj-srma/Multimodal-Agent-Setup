import { contextBridge, ipcRenderer } from 'electron';

export const commandCenterAPI = {
  saveStore: (data: unknown) => ipcRenderer.invoke('acc:saveStore', data),
  loadStore: () => ipcRenderer.invoke('acc:loadStore'),
  getGitStatus: () => ipcRenderer.invoke('acc:getGitStatus'),
  getGitDiff: (filePath?: string) => ipcRenderer.invoke('acc:getGitDiff', filePath),
  gitCommit: (payload: { message: string; files?: string[] }) => ipcRenderer.invoke('acc:gitCommit', payload),
  readFile: (relativePath: string) => ipcRenderer.invoke('acc:readFile', relativePath),
  writeFile: (payload: { relativePath: string; content: string }) => ipcRenderer.invoke('acc:writeFile', payload),
};

contextBridge.exposeInMainWorld('commandCenterAPI', commandCenterAPI);
