export const isCordova = () => !!window.cordova;
export const isAndroid = () => isCordova() && window.device && window.device.platform === 'Android';
export const isIOS = () => isCordova() && window.device && window.device.platform === 'iOS';