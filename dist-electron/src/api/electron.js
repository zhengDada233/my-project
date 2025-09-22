"use strict";
/// <reference lib="dom" />
// 强制引入DOM类型定义，解决window未定义问题
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectronAPIAvailable = isElectronAPIAvailable;
exports.getElectronAPI = getElectronAPI;
// 安全检查window是否存在的辅助函数
function hasWindow() {
    try {
        return typeof window !== 'undefined' && window !== null;
    }
    catch (e) {
        return false;
    }
}
// 检查Electron API是否可用
function isElectronAPIAvailable() {
    if (!hasWindow())
        return false;
    return !!window.electronAPI;
}
// 安全获取Electron API
function getElectronAPI() {
    if (!hasWindow()) {
        throw new Error('window对象不存在，无法访问Electron API');
    }
    if (!window.electronAPI) {
        throw new Error('Electron API未定义');
    }
    return window.electronAPI;
}
//# sourceMappingURL=electron.js.map