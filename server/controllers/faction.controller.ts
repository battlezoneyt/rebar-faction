import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FactionCore, Factions, Grades } from '../../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import * as Utility from '@Shared/utility/index.js';
import { DefaultRanks } from '../../shared/defaultData.js';

const API_NAME = 'faction-handlers-api';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();
const api = Rebar.useApi();
const { useCurrency } = await api.getAsync('currency-api');

const FACTION_COLLECTION = 'Factions';

const factions: { [key: string]: Factions } = {};

class InternalFunctions {
    static update(faction: Factions) {
        factions[faction._id as string] = faction;
    }
}

export async function init() {
    try {
        // Fetch all faction data in a single query
        const factionList = await db.getAll<Factions>(FACTION_COLLECTION);

        if (!factionList || factionList.length === 0) {
            alt.logWarning(`No Factions have been created`);
            return;
        }

        // Load all factions into memory
        for (const faction of factionList) {
            InternalFunctions.update(faction);
        }

        alt.log(`Loaded ${factionList.length} factions successfully.`);
    } catch (error) {
        alt.logError(`Error initializing factions: ${error.message}`);
    }
}

export async function create(characterOwnerID: number, _faction: any): Promise<any> {
    if (!_faction.factionName) {
        alt.logWarning(`Cannot create faction, missing faction name.`);
        return { status: false, response: `Cannot create faction, missing faction name.` };
    }

    const [character] = await db.getMany<Character>({ id: characterOwnerID }, 'Characters');
    if (!character) {
        alt.logWarning(`Could not find a character with identifier: ${characterOwnerID}`);
        return { status: false, response: `Could not find a character with identifier: ${characterOwnerID}` };
    }

    if (character.faction) {
        return { status: false, response: `Character is already in a faction.` };
    }

    const defaultRanks = Utility.clone.objectData<Array<Grades>>(DefaultRanks).map((rank) => ({
        ...rank,
        gradeId: Rebar.utility.sha256Random(JSON.stringify(rank)),
    }));

    const faction: Factions = {
        ..._faction,
        bank: _faction.bank ?? 0,
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

    const existingFactions = await db.getMany<Factions>({ factionName: _faction.factionName }, FACTION_COLLECTION);
    if (existingFactions.length > 0) {
        return { status: false, response: `Cannot insert faction into database.` };
    }

    const document = await db.create<Factions>(faction, FACTION_COLLECTION);
    if (!document) {
        return { status: false, response: `Cannot insert faction into database.` };
    }

    const factionId = document.toString();
    faction._id = factionId;
    InternalFunctions.update(faction);

    character.faction = factionId;
    await db.update({ _id: character._id, faction: character.faction }, 'Characters');
    return { status: true, response: factionId };
}

export async function remove(_id: string): Promise<any> {
    const faction = factions[_id];
    if (!faction) {
        return { status: false, response: `Faction was not found with id: ${_id}` };
    }

    delete factions[_id];

    const ownerIdentifier = Object.values(faction.members).find((member) => member.isOwner)?.id;

    const members = await db.getMany<Character>({ faction: faction._id as string }, 'Characters');
    let onlinePlayers: Array<alt.Player> = [];
    for (const member of members) {
        member.faction = null;
        const xPlayer: alt.Player = getter.byCharacter(member._id);

        if (xPlayer && Rebar.document.character.useCharacter(xPlayer).isValid()) {
            const character = Rebar.document.character.useCharacter(xPlayer);
            await character.set('faction', '');

            if (character.get().id === ownerIdentifier) {
                const characterCurrency = useCurrency(xPlayer, 'Character');
                await characterCurrency.add('bank', faction.bank);
            }

            onlinePlayers.push(xPlayer);
        } else if (member.id === ownerIdentifier) {
            member.bank += faction.bank;
            await db.update({ _id: ownerIdentifier, bank: member.bank }, 'Characters');
        }
    }

    for (const vehicle of faction.vehicles) {
        const altVehicle = alt.Vehicle.all.find((v) => v && v.valid && v.id.toString() === vehicle.vehicleId);
        if (altVehicle) altVehicle.destroy();

        await db.deleteDocument(vehicle.vehicleId, 'Vehicles');
    }

    return { status: true, response: `Deleted faction successfully` };
}

export async function update(_id: string, fieldName: string, partialObject: Partial<Factions>): Promise<any> {
    const faction = factions[_id];
    if (!faction) {
        return { status: false, response: `Faction was not found with id: ${_id}` };
    }

    try {
        await db.update({ _id, [fieldName]: partialObject[fieldName] }, FACTION_COLLECTION);
        return { status: true, response: `Updated Faction Data` };
    } catch (err) {
        console.error(err);
        return { status: false, response: `Failed to update faction data.` };
    }
}

export function findFactionById(_id: string): Factions | null {
    return factions[_id] || null;
}

export function findFactionByName(nameOrPartialName: string): Factions | null {
    const normalizedQuery = nameOrPartialName.replace(/ /g, '').toLowerCase();
    return (
        Object.values(factions).find((faction) =>
            faction.factionName.replace(/ /g, '').toLowerCase().includes(normalizedQuery),
        ) || null
    );
}

export function getAllFactions(): Array<Factions> {
    return Object.values(factions);
}

/**
 * Add to faction bank.
 * Auto-saves
 */
export async function addBank(factionId: string, amount: number): Promise<boolean> {
    const faction = findFactionById(factionId);
    amount = Math.abs(amount);

    faction.bank += amount;
    const didUpdate = await update(faction._id as string, 'bank', { bank: faction.bank });

    return didUpdate.status;
}

/**
 * Remove from faction bank, returns false if amount is too high.
 * Auto-saves
 */
export async function subBank(factionId: string, amount: number): Promise<boolean> {
    const faction = findFactionById(factionId);
    amount = Math.abs(amount);

    if (faction.bank - amount < 0) {
        return false;
    }

    faction.bank -= amount;
    const didUpdate = await update(faction._id as string, 'bank', { bank: faction.bank });

    return didUpdate.status;
}
