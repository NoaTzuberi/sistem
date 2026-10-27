import { useDocumentSurface } from '../../../hooks/useDocumentSurface';

/**
 * While a signed-out screen is open: html / body take the stage's bottom pink (AuthScreen.css) and
 * the theme-color is the stage's top pink.
 */
export function useAuthSurface() {
  useDocumentSurface('auth', '--color-auth-stage-top');
}
