import alt from 'alt-server';
import './api.js';
import './controllers/blip.controller.js';
import './controllers/member.controller.js';
import './controllers/grade.controller.js';
import './controllers/location.controller.js';
import './controllers/duty.controller.js';
import './src/commands.js';
import './controllers/blip.manager.js';
import { init } from './controllers/faction.controller.js';
import { initializeAllGlobalJobBlips } from './controllers/blip.manager.js';
import './controllers/locationManager.js';
// import { updateJobBlips } from './src/updateMembers.js';

await init();
await initializeAllGlobalJobBlips();
// await updateJobBlips();

alt.log('Rebar Faction Plugin Loaded');
