import { createPortal } from 'react-dom';
import { useDocumentSurface } from '../../../hooks/useDocumentSurface';
import './StageBackground.css';

/**
 * The full-screen pink stage (gradient + fine grain) behind a whole screen, with the browser edges
 * painted to match. Portaled to <body>: the page-enter transform on <main> would pin a fixed layer to <main>.
 */
export function StageBackground() {
  useDocumentSurface('stage', '--color-stage-full-top');
  return createPortal(<div className="stage-background" aria-hidden="true" />, document.body);
}
