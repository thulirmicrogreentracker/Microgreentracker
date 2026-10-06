import { useEffect, useState } from 'react';
import { Account, onAccountChange } from './account';
import { accountMode } from './config';

export interface AccountState {
  mode: typeof accountMode;
  loaded: boolean;
  account: Account | null;
}

export const useAccount = (): AccountState => {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(accountMode === 'off');

  useEffect(() => {
    if (accountMode === 'off') return;
    return onAccountChange(a => {
      setAccount(a);
      setLoaded(true);
    });
  }, []);

  return { mode: accountMode, loaded, account };
};
