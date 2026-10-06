// Publisher details shown in the app (Config → About). Keep them in step with docs/store/*.md, which the app also
// shows; any [PLACEHOLDER] left in those documents is replaced with these values.
export const appInfo = {
  appName: 'Thulir MicroGreen Tracker', // also in capacitor.config.ts, index.html, manifest.json
  // The label under the home-screen icon is the short "Thulir MGT" (Android strings.xml, iOS Info.plist), as the full
  // name gets cut off there.
  developerName: 'Rajeshkumar',
  supportEmail: 'thulirmicrogreentracker@gmail.com',
  privacyPolicyUrl: 'https://universepdkt.github.io/Microgreentracker/store/privacy-policy',
  supportUrl: 'https://universepdkt.github.io/Microgreentracker/store/faq',
};

export const isFilledIn = (value: string) => !/^\[.*\]$/.test(value);

export const fillPlaceholders = (text: string): string =>
  ([
    ['[DEVELOPER NAME]', appInfo.developerName],
    ['[SUPPORT EMAIL]', appInfo.supportEmail],
    ['[PRIVACY POLICY URL]', appInfo.privacyPolicyUrl],
    ['[SUPPORT URL]', appInfo.supportUrl],
  ] as const).reduce((t, [placeholder, value]) => t.split(placeholder).join(value), text);
