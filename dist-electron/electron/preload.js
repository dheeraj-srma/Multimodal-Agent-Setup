"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandCenterAPI = void 0;
const electron_1 = require("electron");
exports.commandCenterAPI = {
    saveStore: (data) => electron_1.ipcRenderer.invoke('acc:saveStore', data),
    loadStore: () => electron_1.ipcRenderer.invoke('acc:loadStore'),
    getGitStatus: () => electron_1.ipcRenderer.invoke('acc:getGitStatus'),
    getGitDiff: (filePath) => electron_1.ipcRenderer.invoke('acc:getGitDiff', filePath),
    gitCommit: (payload) => electron_1.ipcRenderer.invoke('acc:gitCommit', payload),
    readFile: (relativePath) => electron_1.ipcRenderer.invoke('acc:readFile', relativePath),
    writeFile: (payload) => electron_1.ipcRenderer.invoke('acc:writeFile', payload),
};
electron_1.contextBridge.exposeInMainWorld('commandCenterAPI', exports.commandCenterAPI);
