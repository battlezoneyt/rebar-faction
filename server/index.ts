import alt from 'alt-server';

import './src/functions.js';
import './src/commands.js';
import { init } from './src/handlers.js';
import { updateJobBlips } from './src/updateMembers.js';
import './api.js';

await init();
await updateJobBlips();
