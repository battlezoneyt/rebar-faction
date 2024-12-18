import alt from 'alt-server';

import './functions.js';
import './commands.js';
import { init } from './handlers.js';
import { updateJobBlips } from './updateMembers.js';

await init();
await updateJobBlips();
