import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import './handlers.js';
import './functions.js';
import './commands.js';
import { updateFactionMembers } from './updateMembers.js';
import { Character } from '@Shared/types/character.js';

const Rebar = useRebar();
const api = Rebar.useApi();

Rebar.events.useEvents().on('character-bound', (player: alt.Player, document: Character) => {
    updateFactionMembers(document.faction);
});
