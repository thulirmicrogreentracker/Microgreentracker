// Publisher details shown in the app and in docs/store/*.md. Fill them in before publishing; the in-app privacy
// policy and FAQ replace the matching [PLACEHOLDERS] in those documents with these values.
export const appInfo = {
  developerName: '[DEVELOPER NAME]',
  supportEmail: '[SUPPORT EMAIL]',
  privacyPolicyUrl: '[PRIVACY POLICY URL]',
  supportUrl: '[SUPPORT URL]',
};

export const isFilledIn = (value: string) => !/^\[.*\]$/.test(value);

export const fillPlaceholders = (text: string): string =>
  ([
    ['[DEVELOPER NAME]', appInfo.developerName],
    ['[SUPPORT EMAIL]', appInfo.supportEmail],
    ['[PRIVACY POLICY URL]', appInfo.privacyPolicyUrl],
    ['[SUPPORT URL]', appInfo.supportUrl],
  ] as const).reduce((t, [placeholder, value]) => t.split(placeholder).join(value), text);
