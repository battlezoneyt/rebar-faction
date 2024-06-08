import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FactionCore, Factions, Grades } from '../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import * as Utility from '@Shared/utility/index.js';
import { DefaultRanks } from '../shared/defaultData.js';

const API_NAME = 'faction-api';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const FACTION_COLLECTION = 'Factions';

export function useApi() {
    async function create(characterOwnerID: string, _faction: FactionCore): Promise<any> {
        if (!_faction.factionName) {
            alt.logWarning(`Cannot create faction, missing faction name.`);
            return { status: false, response: `Cannot create faction, missing faction name.` };
        }

        if (_faction.bank === null || _faction.bank === undefined) {
            _faction.bank = 0;
        }

        const result = await db.getMany<Character>({ _id: characterOwnerID }, 'Characters');
        const character = result[0];
        if (!character) {
            alt.logWarning(`Could not find a character with identifier: ${characterOwnerID}`);
            return { status: false, response: `Could not find a character with identifier: ${characterOwnerID}` };
        }

        if (character.faction) {
            return { status: false, response: `Character is already in a faction.` };
        }

        const defaultRanks = Utility.clone.objectData<Array<Grades>>(DefaultRanks);
        for (let i = 0; i < defaultRanks.length; i++) {
            defaultRanks[i].gradeId = Rebar.utility.sha256Random(JSON.stringify(defaultRanks[i]));
        }

        const faction: Factions = {
            ..._faction,
            members: {
                [characterOwnerID]: {
                    id: characterOwnerID,
                    name: character.name,
                    duty: true,
                    gradeId: defaultRanks[0].gradeId,
                    isOwner: true,
                },
            },
            grades: defaultRanks,
            locations: [],
            vehicles: [],
        };

        const document = await db.create<Factions>(faction, FACTION_COLLECTION);
        if (!document) {
            alt.logWarning(`Cannot insert faction into database.`);
            return { status: false, response: `Cannot insert faction into database.` };
        }

        character.faction = document.toString();
        const didUpdate = await db.update({ _id: character._id, faction: character.faction }, 'Characters');
        return { status: false, response: document.toString() };
    }

    function remove() {}

    return {
        create,
        remove,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useApi>;
    }
}

Rebar.useApi().register(API_NAME, useApi());
