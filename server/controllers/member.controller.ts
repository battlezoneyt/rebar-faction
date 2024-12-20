import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { UserFaction } from '../../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import { findFactionById, update } from './faction.controller.js';
import { getFactionRankBelowHighest, getRankWithHighestWeight, getRankWithLowestWeight } from './grade.controller.js';

const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();

export async function setOwner(factionId: string, characterIdentifier: number): Promise<boolean> {
    const faction = findFactionById(factionId);

    if (!faction.members[characterIdentifier]) {
        return false;
    }

    const owner = await getFactionOwner(factionId);
    const ownerRank = (await getRankWithHighestWeight(factionId)).gradeId;

    if (owner) {
        faction.members[owner.id].isOwner = false;
        faction.members[owner.id].gradeId = (await getFactionRankBelowHighest(factionId)).gradeId;
    }

    faction.members[characterIdentifier].gradeId = ownerRank;
    faction.members[characterIdentifier].isOwner = true;

    const didUpdate = await update(faction._id as string, 'members', {
        members: faction.members,
    });

    return didUpdate.status;
}
/**
 * Returns the faction member who is currently the owner.
 *
 * @static
 * @param {Faction} faction
 * @return {FactionMember}
 * @memberof FactionFuncs
 */
export async function getFactionOwner(factionId: string): Promise<UserFaction> | undefined {
    const faction = findFactionById(factionId);
    const members = Object.values(faction.members);
    for (const member of members) {
        if (member.isOwner) {
            return member;
        }
    }

    return undefined;
}

/**
 * Arbitrary way to add a character to a faction based on character identifier.
 * Auto-saves
 */
export async function addMember(factionId: string, characterId: number): Promise<string> {
    try {
        const faction = findFactionById(factionId);
        if (!faction) {
            throw new Error('Faction not found');
        }

        const lowestRank = await getRankWithLowestWeight(factionId);
        const [character] = await db.getMany<Character>({ id: characterId }, 'Characters');
        if (!character || character.faction) {
            return 'Character not found or already in faction';
        }

        const onlinePlayer = getter.byCharacter(characterId);
        const characterData = Rebar.document.character.useCharacter(onlinePlayer);
        faction.members[characterId] = {
            id: characterId,
            name: character.name,
            gradeId: lowestRank.gradeId,
            duty: faction.defaultDuty,
            isOwner: false,
        };

        if (onlinePlayer && characterData.isValid()) {
            await characterData.set('faction', faction._id.toString());
        } else {
            await db.update({ _id: characterId, faction: faction._id.toString() }, 'Characters');
        }

        await update(faction._id as string, 'members', {
            members: faction.members,
        });
        return `Updated Faction members successfully`;
    } catch (error) {
        console.error(`Failed to add member: ${error.message}`);
        return `Failed to add member: ${error.message}`;
    }
}

/**
 * Arbitrary way to kick a character from a faction.
 * Auto-saves
 */
export async function kickMember(factionId: string, characterId: number): Promise<boolean> {
    const faction = findFactionById(factionId);
    if (!faction) {
        return false;
    }

    const result = await db.getMany<Character>({ id: characterId }, 'Characters');
    const character = result[0];
    if (character.faction != factionId) return false;
    const xTarget = getter.byCharacter(characterId);
    const characterData = Rebar.document.character.useCharacter(xTarget);
    if (xTarget && characterData.isValid()) {
        await characterData.set('faction', null);
        // alt.emitClient(xTarget, FACTION_EVENTS.PROTOCOL.REFRESH, null);
    } else if (character) {
        const result = await db.update({ _id: characterId, faction: null }, 'Characters');
    }

    delete faction.members[characterId];
    const didUpdate = await update(faction._id as string, 'members', {
        members: faction.members,
    });

    return didUpdate.status;
}
