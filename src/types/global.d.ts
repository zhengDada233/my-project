export interface ElectronAPI {
  sendSignedRequest: (params: any) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}