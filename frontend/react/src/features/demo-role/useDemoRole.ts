import { useContext } from 'react';
import { DemoRoleContext, type DemoRoleContextValue } from './DemoRoleProvider';

export function useDemoRole(): DemoRoleContextValue {
  const value = useContext(DemoRoleContext);
  if (!value) throw new Error('useDemoRole precisa estar dentro de DemoRoleProvider');
  return value;
}
