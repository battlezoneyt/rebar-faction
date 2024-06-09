import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FactionCore, Factions, Grades, UserFaction } from '../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import { useFactionHandlers } from './handlers.js';
const API_NAME = 'faction-functions-api';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();
const api = Rebar.useApi();

const FACTION_COLLECTION = 'Factions';

export function useFactionFunctions() {
    /**
     * Handle refreshing the faction information.
     *
     */
    function updateMembers(faction: Factions) {
        const memberIdentifiers = Object.keys(faction.members);
        const members = alt.Player.all.filter((p) => p && p.valid && p && memberIdentifiers.includes(p.id.toString()));
        console.log(members);
    }

    /**
     * Get a faction character's rank based on character identifier
     *
     */
    async function setOwner(faction: Factions, characterIdentifier: string): Promise<boolean> {
        if (!faction.members[characterIdentifier]) {
            return false;
        }

        const owner = getFactionOwner(faction);
        const ownerRank = owner.gradeId;

        if (owner) {
            faction.members[owner.id].isOwner = false;
            faction.members[owner.id].gradeId = getFactionRankBelowHighest(faction).gradeId;
        }

        faction.members[characterIdentifier].gradeId = ownerRank;
        faction.members[characterIdentifier].isOwner = true;

        const didUpdate = await useFactionHandlers().update(faction._id as string, { members: faction.members });
        if (didUpdate.status) {
            updateMembers(faction);
        }

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
    function getFactionOwner(faction: Factions): UserFaction | undefined {
        const members = Object.values(faction.members);
        for (const member of members) {
            if (member.isOwner) {
                return member;
            }
        }

        return undefined;
    }
    /**
     * Returns the next highest rank from the 'owner' rank.
     *
     */
    function getFactionRankBelowHighest(faction: Factions) {
        // Descending Order. Starts at 99
        const ranks = faction.grades.sort((a, b) => {
            return b.permissionLevel - a.permissionLevel;
        });

        return ranks[1] ? ranks[1] : ranks[0];
    }

    /**
     * Get a faction character's rank based on character identifier
     *
     */
    function getFactionMemberRank(faction: Factions, characterId: string): Grades | null {
        const member = faction.members[characterId];
        if (!member) {
            return null;
        }

        return faction.grades.find((r) => r.gradeId === member.gradeId);
    }

    /**
     * Returns the lowest rank for the faction based on weight
     *
     */
    function getRankWithLowestWeight(faction: Factions): Grades {
        let lowestRank = faction.grades[0];

        for (let i = 0; i < faction.grades.length; i++) {
            if (faction.grades[i].permissionLevel >= lowestRank.permissionLevel) {
                continue;
            }

            lowestRank = faction.grades[i];
        }

        return lowestRank;
    }

    /**
     * Check if a rank is above another rank
     *
     */
    function isRankAbove(faction: Factions, _rank: string, _vsRank: string): boolean {
        const rank = faction.grades.find((r) => r.gradeId === _rank);
        const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
        return rank.permissionLevel > vsRank.permissionLevel ? true : false;
    }

    /**
     * Check if a rank is below another rank
     *
     */
    function isRankBelow(faction: Factions, _rank: string, _vsRank: string): boolean {
        const rank = faction.grades.find((r) => r.gradeId === _rank);
        const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
        return rank.permissionLevel < vsRank.permissionLevel ? true : false;
    }

    /**
     * Add to faction bank.
     * Auto-saves
     */
    async function addBank(faction: Factions, amount: number): Promise<boolean> {
        amount = Math.abs(amount);

        faction.bank += amount;
        const didUpdate = await useFactionHandlers().update(faction._id as string, { bank: faction.bank });
        if (didUpdate.status) {
            updateMembers(faction);
        }

        return didUpdate.status;
    }

    /**
     * Remove from faction bank, returns false if amount is too high.
     * Auto-saves
     */
    async function subBank(faction: Factions, amount: number): Promise<boolean> {
        amount = Math.abs(amount);

        if (faction.bank - amount < 0) {
            return false;
        }

        faction.bank -= amount;
        const didUpdate = await useFactionHandlers().update(faction._id as string, { bank: faction.bank });
        if (didUpdate.status) {
            updateMembers(faction);
        }

        return didUpdate.status;
    }

    /**
     * Arbitrary way to set a rank for a character regardless of their standing.
     * Auto-saves
     */
    async function setCharacterRank(faction: Factions, characterID: string, newRank: string): Promise<boolean> {
        const rankIndex = faction.grades.findIndex((x) => x.gradeId === newRank);
        if (rankIndex <= -1) {
            return false;
        }

        if (faction.grades[rankIndex].permissionLevel >= 99) {
            return false;
        }

        faction.members[characterID].gradeId = newRank;

        const didUpdate = await useFactionHandlers().update(faction._id as string, { members: faction.members });
        if (didUpdate.status) {
            updateMembers(faction);
        }

        return didUpdate.status;
    }

    /**
     * Arbitrary way to add a character to a faction based on character identifier.
     * Auto-saves
     */
    async function addMember(faction: Factions, characterID: string): Promise<boolean> {
        const lowestRank = getRankWithLowestWeight(faction);
        const result = await db.getMany<Character>({ _id: characterID }, 'Characters');
        const character = result[0];
        if (!character) {
            return false;
        }
        const xPlayer: alt.Player = getter.byCharacter(characterID);
        const playerData = Rebar.document.character.useCharacter(xPlayer);
        if (!playerData.isValid) {
            return false;
        }
        await playerData.set('faction', faction._id.toString());
        faction.members[characterID] = {
            id: characterID,
            name: character.name,
            gradeId: lowestRank.gradeId,
            duty: faction.defaultDuty,
            isOwner: false,
        };

        const didUpdate = await useFactionHandlers().update(faction._id as string, { members: faction.members });
        if (didUpdate.status) {
            updateMembers(faction);
        }

        return didUpdate.status;
    }

    return {
        updateMembers,
        setOwner,
        getFactionOwner,
        getFactionRankBelowHighest,
        getFactionMemberRank,
        getRankWithLowestWeight,
        isRankAbove,
        isRankBelow,
        addBank,
        subBank,
        setCharacterRank,
        addMember,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useFactionFunctions>;
    }
}

Rebar.useApi().register(API_NAME, useFactionFunctions());
