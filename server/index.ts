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
    console.log(document.faction);
    if (document.faction) {
        console.log(document.faction);
        await updateFactionMembers(document.faction);
    }
});

alt.on('playerDisconnect', async (player: alt.Player) => {
    const character = Rebar.document.character.useCharacter(player);
    if (!character) return;
    const document = character.get();
    if (!document || !document.faction) return;
    if (document.faction) {
        await updateFactionMembers(document.faction);
    }
});
