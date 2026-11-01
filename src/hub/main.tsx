import {createRoot} from 'react-dom/client';
import './data';
import {HubApp} from './HubApp';
import {PAGES} from './pages';

// Casca React do hub. Carrega depois dos scripts clássicos de js/ (index.html), então as funções globais
// deles já existem. O renderPage de js/app.js pula as páginas que a casca desenha.
window.hubIsReactPage = page => !!PAGES[page];

// A casca não tem tela própria: as páginas migradas vão por portal ao #reactPage (HubApp).
const root = document.createElement('div');
root.id = 'hubRoot';
root.hidden = true;
document.body.appendChild(root);
createRoot(root).render(<HubApp />);
