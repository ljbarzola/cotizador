import './styles.css';
import { initAuth } from './modules/auth.js';
import { initCatalog } from './modules/catalog.js';
import { initQuote } from './modules/quote.js';
import { initSync } from './modules/sync.js';
import './app.js';

initAuth();
initCatalog();
initQuote();
initSync();
