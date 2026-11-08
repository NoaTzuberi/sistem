import { createPortal } from 'react-dom';
import './StageBackground.css';

/**
 * The full-screen pink stage (gradient + fine grain) behind a whole screen. Its screen paints the browser
 * edges to match: `<AppShell bottom="stage">` (useDocumentSurface). Portaled to <body>: the page-enter
 * transform on <main> would pin a fixed layer to <main>.
 */
export function StageBackground() {
  return createPortal(<div className="stage-background" aria-hidden="true" />, document.body);
}
