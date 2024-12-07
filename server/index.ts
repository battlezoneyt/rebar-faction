import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import './handlers.js';
import './functions.js';
import './commands.js';
import { updateFactionMembers, updateJobBlips } from './updateMembers.js';
import { Character } from '@Shared/types/character.js';

const Rebar = useRebar();
const api = Rebar.useApi();

alt.on('rebar:playerCharacterBound', async (player: alt.Player, document: Character) => {
    updateJobBlips(player);
    updateFactionMembers(document.faction);
});
