import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FactionCore, Factions, Grades } from '../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import * as Utility from '@Shared/utility/index.js';
import { DefaultRanks } from '../shared/defaultData.js';
import { KnownKeys } from '@Shared/utilityTypes/index.js';

const API_NAME = 'faction-handlers-api';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();
const api = Rebar.useApi();
const { useCurrency } = await api.getAsync('currency-api');

const FACTION_COLLECTION = 'Factions';

const factions: { [key: string]: Factions } = {};
type FactionChangeCallback = (_id: string, fieldName: string) => void;
const callbacks: FactionChangeCallback[] = [];

class InternalFunctions {
    static update(faction) {
        factions[faction._id as string] = faction;
    }
}
async function init() {
    const factions = await db.getAll<{ _id: string }>(FACTION_COLLECTION);
    if (factions.length <= 0) {
        alt.logWarning(`No Factions have been Created`);
        return;
    }

    factions.forEach((element) => {
        InternalFunctions.update(element);
    });
}

export function useFactionHandlers() {
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
            locations: {},
            vehicles: [],
        };

        const results = await db.getMany<Factions>({ factionName: _faction.factionName }, FACTION_COLLECTION);
        if (results.length > 0) {
            alt.logWarning(`This Faction ` + _faction.factionName + ` already creadted.`);
            return { status: false, response: `Cannot insert faction into database.` };
        }

        const document = await db.create<Factions>(faction, FACTION_COLLECTION);
        if (!document) {
            alt.logWarning(`Cannot insert faction into database.`);
            return { status: false, response: `Cannot insert faction into database.` };
        }
        const createdFaction = await db.getMany<Factions>({ _id: document }, FACTION_COLLECTION);
        character.faction = document.toString();
        InternalFunctions.update(createdFaction);

        const didUpdate = await db.update({ _id: character._id, faction: character.faction }, 'Characters');
        return { status: false, response: document.toString() };
    }

    async function remove(_id: string): Promise<any> {
        const faction = factions[_id];
        if (!faction) {
            return { status: false, response: `Faction was not found with id: ${_id}` };
        }
        // Remove the faction outright...
        const factionClone = Utility.clone.objectData<Factions>(faction);
        delete factions[_id];

        // Fetch faction owner...
        const ownerIdentifier = await new Promise((resolve: Function) => {
            Object.keys(factionClone.members).forEach((key) => {
                if (!factionClone.members[key].isOwner) {
                    return;
                }

                return resolve(factionClone.members[key].id);
            });
        });

        // Clear all members...
        const members = await db.getMany<Character>({ faction: factionClone._id as string }, 'Characters');
        let onlinePlayers: Array<alt.Player> = [];
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            member.faction = null;
            const xPlayer: alt.Player = getter.byCharacter(members[i]._id);

            if (xPlayer && Rebar.document.character.useCharacter(xPlayer).isValid()) {
                const character = Rebar.document.character.useCharacter(xPlayer);
                const playerData = character.get();
                const result = await character.set('faction', '');
                // Add bank balance to owner character
                if (playerData._id === ownerIdentifier) {
                    const characterCurrency = useCurrency(xPlayer, 'Character');
                    await characterCurrency.add('bank', factionClone.bank);
                }

                onlinePlayers.push(xPlayer);
            }

            // For non-logged in character owner add bank balance
            if (!xPlayer && member._id === ownerIdentifier) {
                member.bank += factionClone.bank;
                await db.update({ _id: ownerIdentifier, bank: member.bank }, 'Character');
                continue;
            }
        }

        // Clear all vehicles...
        for (let i = 0; i < factionClone.vehicles.length; i++) {
            const vehicleId = factionClone.vehicles[i].vehicleId;
            const vehicle = alt.Vehicle.all.find((v) => v && v.valid && v && v.id.toString() === vehicleId);

            if (vehicle) {
                vehicle.destroy();
            }

            await db.deleteDocument(vehicleId, 'Vehicles');
        }

        //Below things need to be ported when we have inventory and garrage system ready!!!

        // // Force close storage...
        // for (let i = 0; i < onlinePlayers.length; i++) {
        //     if (!onlinePlayers[i] || !onlinePlayers[i].valid) {
        //         continue;
        //     }

        //     Athena.systems.storage.closeOnDisconnect(onlinePlayers[i], onlinePlayers[i].id.toString());
        // }

        // Delete storage...
        // if (factionClone.storages && Array.isArray(factionClone.storages)) {
        //     for (let i = 0; i < factionClone.storages.length; i++) {
        //         const storageId = factionClone.storages[i];
        //         Database.deleteById(storageId, Collections.Storage);
        //     }
        // }

        return { status: true, response: `Deleted faction successfully` };
    }

    /**
     * Used to update faction data, and automatically propogate changes for
     * users with faction panel open.
     */
    async function update(_id: string, fieldName: string, partialObject: Partial<Factions>): Promise<any> {
        const faction = factions[_id];
        const typeSafeFieldName = String(fieldName);

        if (!faction) {
            return { status: false, response: `Faction was not found with id: ${_id}` };
        }

        try {
            const result = await db.update(
                { _id: _id, [typeSafeFieldName]: partialObject[typeSafeFieldName] },
                FACTION_COLLECTION,
            );
            console.log(result);
        } catch (err) {
            console.log(err);
        }
        for (let cb of callbacks) {
            cb(_id, fieldName);
        }
        return { status: true, response: `Updated Faction Data` };
    }
    async function findFactionById(_id: string): Promise<Factions | null> {
        return factions[_id] || null;
    }

    function findFactionByname(nameOrPartialName: string): Factions | null {
        let faction: Factions;

        nameOrPartialName = nameOrPartialName.replace(/ /g, '').toLowerCase();

        const factionsList = Object.values(faction) as Array<Factions>;
        const index = factionsList.findIndex((f) => {
            const adjustedName = f.factionName.replace(/ /g, '').toLowerCase();
            if (adjustedName.includes(nameOrPartialName)) {
                return true;
            }

            return false;
        });

        if (index <= -1) {
            return null;
        }

        return factionsList[index];
    }

    function getAllFactions() {
        return Object.values(factions) as Array<Factions>;
    }

    function onUpdate(callback: FactionChangeCallback) {
        callbacks.push(callback);
    }

    return {
        create,
        remove,
        update,
        onUpdate,
        findFactionByname,
        findFactionById,
        getAllFactions,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useFactionHandlers>;
    }
}

Rebar.useApi().register(API_NAME, useFactionHandlers());

init();
