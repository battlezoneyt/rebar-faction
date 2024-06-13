import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { FactionCore, Factions, Grades, JobLocal, Locations, UserFaction } from '../shared/interface.js';
import { Character } from '@Shared/types/character.js';
import { useFactionHandlers } from './handlers.js';

const API_NAME = 'faction-functions-api';
const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();
const api = Rebar.useApi();
const RebarEvents = Rebar.events.useEvents();
const FACTION_COLLECTION = 'Factions';

export function useFactionFunctions() {
    /**
     * Get a faction character's rank based on character identifier
     *
     */
    async function setOwner(factionId: string, characterIdentifier: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);

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

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
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
    async function getFactionOwner(factionId: string): Promise<UserFaction> | undefined {
        const faction = await useFactionHandlers().findFactionById(factionId);
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
    async function getFactionRankBelowHighest(factionId: string) {
        const faction = await useFactionHandlers().findFactionById(factionId);
        // Descending Order. Starts at 99
        const ranks = faction.grades.sort((a, b) => {
            return b.permissionLevel - a.permissionLevel;
        });

        return ranks[1] ? ranks[1] : ranks[0];
    }
    async function getRankWithHighestWeight(factionId: string) {
        const faction = await useFactionHandlers().findFactionById(factionId);
        // Aescending Order. Ending at 99
        const ranks = faction.grades.sort((a, b) => {
            return a.permissionLevel - b.permissionLevel;
        });

        return ranks[0];
    }
    /**
     * Get a faction character's rank based on character identifier
     *
     */
    async function getFactionMemberRank(factionId: string, characterId: string): Promise<Grades> | null {
        const faction = await useFactionHandlers().findFactionById(factionId);
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
    async function getRankWithLowestWeight(factionId: string): Promise<Grades> {
        const faction = await useFactionHandlers().findFactionById(factionId);
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
    async function isRankAbove(factionId: string, _rank: string, _vsRank: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const rank = faction.grades.find((r) => r.gradeId === _rank);
        const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
        return rank.permissionLevel > vsRank.permissionLevel ? true : false;
    }

    /**
     * Check if a rank is below another rank
     *
     */
    async function isRankBelow(factionId: string, _rank: string, _vsRank: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const rank = faction.grades.find((r) => r.gradeId === _rank);
        const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
        return rank.permissionLevel < vsRank.permissionLevel ? true : false;
    }

    /**
     * Add to faction bank.
     * Auto-saves
     */
    async function addBank(factionId: string, amount: number): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        amount = Math.abs(amount);

        faction.bank += amount;
        const didUpdate = await useFactionHandlers().update(faction._id as string, 'bank', { bank: faction.bank });

        return didUpdate.status;
    }

    /**
     * Remove from faction bank, returns false if amount is too high.
     * Auto-saves
     */
    async function subBank(factionId: string, amount: number): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        amount = Math.abs(amount);

        if (faction.bank - amount < 0) {
            return false;
        }

        faction.bank -= amount;
        const didUpdate = await useFactionHandlers().update(faction._id as string, 'bank', { bank: faction.bank });

        return didUpdate.status;
    }

    /**
     * Arbitrary way to set a rank for a character regardless of their standing.
     * Auto-saves
     */
    async function setCharacterRank(factionId: string, characterID: string, newRank: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const rankIndex = faction.grades.findIndex((x) => x.gradeId === newRank);
        if (rankIndex <= -1) {
            return false;
        }

        if (faction.grades[rankIndex].permissionLevel >= 99) {
            return false;
        }

        faction.members[characterID].gradeId = newRank;

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
            members: faction.members,
        });
        return didUpdate.status;
    }

    /**
     * Arbitrary way to add a character to a faction based on character identifier.
     * Auto-saves
     */
    async function addMember(factionId: string, characterID: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (!faction) {
            return false;
        }
        const lowestRank = await getRankWithLowestWeight(factionId);
        const result = await db.getMany<Character>({ _id: characterID }, 'Characters');
        const character = result[0];
        if (!character || character.faction) {
            return false;
        }
        const onlinePlayer = getter.byCharacter(characterID);
        const characterData = Rebar.document.character.useCharacter(onlinePlayer);
        faction.members[characterID] = {
            id: characterID,
            name: character.name,
            gradeId: lowestRank.gradeId,
            duty: faction.defaultDuty,
            isOwner: false,
        };

        if (onlinePlayer && characterData.isValid()) {
            await characterData.set('faction', faction._id.toString());
        } else {
            await db.update({ _id: characterID, faction: faction._id.toString() }, 'Characters');
        }

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
            members: faction.members,
        });

        return didUpdate.status;
    }

    /**
     * Arbitrary way to kick a character from a faction.
     * Auto-saves
     */
    async function kickMember(factionId: string, characterID: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (!faction) {
            return false;
        }

        const result = await db.getMany<Character>({ _id: characterID }, 'Characters');
        const character = result[0];
        if (character.faction != factionId) return false;
        const xTarget = getter.byCharacter(characterID);
        const characterData = Rebar.document.character.useCharacter(xTarget);
        if (xTarget && characterData.isValid()) {
            await characterData.set('faction', null);
            // alt.emitClient(xTarget, FACTION_EVENTS.PROTOCOL.REFRESH, null);
        } else if (character) {
            const result = await db.update({ _id: characterID, faction: null }, 'Characters');
        }

        delete faction.members[characterID];
        const didUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
            members: faction.members,
        });

        return didUpdate.status;
    }

    /**
     * Change a rank name based on rank uid
     * Auto-saves
     */
    async function updateRankName(factionId: string, rankUid: string, newName: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (!faction) {
            return false;
        }
        const index = faction.grades.findIndex((r) => r.gradeId === rankUid);
        if (index <= -1) {
            return false;
        }

        faction.grades[index].name = newName;

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'grades', {
            grades: faction.grades,
        });

        return didUpdate.status;
    }

    /**
     * Removes a rank from the rank list for a faction.
     * Auto-saves
     */
    async function removeRank(factionId: string, rankUid: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const index = faction.grades.findIndex((r) => r.gradeId === rankUid);

        // Do not allow less than two ranks at any given time.
        if (faction.grades.length <= 2) {
            return false;
        }

        if (index <= -1) {
            return false;
        }

        if (faction.grades[index].permissionLevel >= 99) {
            return false;
        }

        const orderedRanks = faction.grades.sort((a, b) => {
            return b.permissionLevel - a.permissionLevel;
        });

        const orderedRankIndex = orderedRanks.findIndex((x) => x.gradeId === orderedRanks[index].gradeId);
        let replacementRank: Grades;

        // What does this mean?
        // It means that if the orderedRankIndex is the LAST element in the array.
        // We know that the only option is to go up the array for the next weight.
        // Thus resulting in the rank we need.
        if (orderedRankIndex === orderedRanks.length - 1) {
            replacementRank = orderedRanks[orderedRanks.length - 2];
        } else {
            // Now if it's NOT the last element in the array.
            // We need to increase the orderedRankIndex by 1.
            // Since it's ordered that means the smallest weight is in the back.
            replacementRank = orderedRanks[orderedRankIndex + 1];
        }

        const removedRank = faction.grades.splice(index, 1)[0];

        if (replacementRank) {
            Object.keys(faction.members).forEach((key) => {
                if (faction.members[key].gradeId !== removedRank.gradeId) {
                    return;
                }

                faction.members[key].gradeId = replacementRank.gradeId;
            });
        }

        const didGradeUpdate = await useFactionHandlers().update(faction._id as string, 'grades', {
            grades: faction.grades,
        });
        const didMemberUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
            members: faction.members,
        });

        return didMemberUpdate.status;
    }

    /**
     * Adds a rank to the ranks list for a faction.
     * Auto-saves
     */
    async function addRank(
        factionId: string,
        newName: string,
        weight: number,
        onDutyPay: number,
        offDutyPay: number,
        maxOnDutyPay: number,
        maxOffDutyPay: number,
    ): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const rankIndex = faction.grades.findIndex((r) => r.permissionLevel === weight);
        if (rankIndex >= 0 || maxOnDutyPay > onDutyPay || maxOffDutyPay > offDutyPay) {
            return false;
        }

        faction.grades.push({
            gradeId: Rebar.utility.sha256Random(JSON.stringify(faction.grades)),
            name: newName,
            permissionLevel: weight,
            onDutyPay: onDutyPay,
            offDutyPay: offDutyPay,
            maxOnDutyPay: maxOnDutyPay,
            maxOffDutyPay: maxOffDutyPay,
        });

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'grades', {
            grades: faction.grades,
        });

        return didUpdate.status;
    }

    /**
     * Adds Locations based on Location Interface Type.
     * Auto-saves
     */
    async function addLocations(
        player: alt.Player,
        factionId: string,
        locationType: keyof Locations,
        locationName: string,
        pos: alt.Vector3,
        gradeId: string,
        parkingSpots?: Array<{ pos: alt.Vector3; rot: alt.Vector3 }>,
    ): Promise<boolean> {
        const factionData = await useFactionHandlers().findFactionById(factionId);
        if (factionData.locations[locationType] !== undefined) {
            if (factionData.locations[locationType].length > 0) {
                const index = factionData.locations[locationType].findIndex((r) => r.locationName != locationName);
                if (index <= -1) {
                    return false;
                }
            }
        } else {
            factionData.locations[locationType] = [];
        }
        let location: JobLocal = {
            locationId: Rebar.utility.sha256Random(JSON.stringify(factionData.grades)),
            locationName: locationName,
            pos: pos,
            gradeId: gradeId,
            parkingSpots: parkingSpots,
        };
        try {
            factionData.locations[locationType].push(location);
        } catch (err) {
            console.log(err);
        }
        const didUpdate = await useFactionHandlers().update(factionData._id as string, 'locations', {
            locations: factionData.locations,
        });

        if (didUpdate.status) {
            // updateMembers(faction);
        }

        return didUpdate.status;
    }

    /**
     * Remove Locations based on Location Interface Type.
     * Auto-saves
     */
    async function removeLocations(
        player: alt.Player,
        factionId: string,
        locationType: keyof Locations,
        locationId: string,
    ): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (faction.locations[locationType] === undefined) return false;
        if (faction.locations[locationType].length < 0) return false;
        const index = faction.locations[locationType].findIndex((r) => r.locationId === locationId);
        if (index <= -1) {
            return false;
        }
        try {
            faction.locations[locationType] = faction.locations[locationType].filter(
                (location) => location.locationId !== locationId,
            );
        } catch (err) {
            console.log(err);
        }

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'locations', {
            locations: faction.locations,
        });
        if (didUpdate.status) {
            // updateMembers(faction);
        }

        return didUpdate.status;
    }

    /**
     * Remove Locations based on Location Interface Type.
     * Auto-saves
     */
    async function getLocationsByType(factionId: string, locationType: string): Promise<Array<JobLocal>> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        return faction.locations[locationType];
    }

    /**
     * Updates rank weight to specified weight.
     * Ensures that rank is not already weight 99.
     * Auto-saves
     */
    async function updateRankWeight(factionId: string, rankUid: string, weight: number): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (weight <= -1 || weight >= 99) {
            return false;
        }

        const index = faction.grades.findIndex((r) => r.gradeId === rankUid);
        if (index <= -1) {
            return false;
        }

        faction.grades[index].permissionLevel = weight;
        const didUpdate = await useFactionHandlers().update(faction._id as string, 'grades', {
            grades: faction.grades,
        });

        return didUpdate.status;
    }

    /**
     * Swap rank weights based on uids.
     *
     */
    async function swapRanks(factionId: string, swap: string, swapWith: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        const fromIndex = faction.grades.findIndex((r) => r.gradeId === swap);
        const withIndex = faction.grades.findIndex((r) => r.gradeId === swapWith);

        if (fromIndex <= -1 || withIndex <= -1) {
            return false;
        }

        const fromWeight = faction.grades[fromIndex].permissionLevel;
        const withWeight = faction.grades[withIndex].permissionLevel;

        faction.grades[fromIndex].permissionLevel = withWeight;
        faction.grades[withIndex].permissionLevel = fromWeight;

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'grades', {
            grades: faction.grades,
        });

        return didUpdate.status;
    }

    async function getDuty(factionId: string, characterId: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);

        return faction.members[characterId].duty;
    }

    async function setDuty(factionId: string, characterId: string): Promise<boolean> {
        const faction = await useFactionHandlers().findFactionById(factionId);
        if (!faction.members[characterId]) {
            return false;
        }
        const result = await db.getMany<Character>({ _id: characterId }, 'Characters');
        const character = result[0];

        if (!character) return false;
        faction.members[characterId].duty = !faction.members[characterId].duty;

        const didUpdate = await useFactionHandlers().update(faction._id as string, 'members', {
            members: faction.members,
        });
        return didUpdate.status;
    }

    return {
        setOwner,
        getFactionOwner,
        getFactionRankBelowHighest,
        getFactionMemberRank,
        getRankWithLowestWeight,
        getRankWithHighestWeight,
        isRankAbove,
        isRankBelow,
        addBank,
        subBank,
        setCharacterRank,
        addMember,
        kickMember,
        updateRankName,
        removeRank,
        addRank,
        updateRankWeight,
        swapRanks,
        addLocations,
        removeLocations,
        getLocationsByType,
        getDuty,
        setDuty,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useFactionFunctions>;
    }
}

Rebar.useApi().register(API_NAME, useFactionFunctions());
