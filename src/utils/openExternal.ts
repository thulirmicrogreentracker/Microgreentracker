// Opens a web page or store page outside the app. Capacitor hands navigation to other sites to the system browser
// (or the store app, for store links) instead of loading it in the app's web view.
export const openExternal = (url: string) => {
  window.location.href = url;
};
