import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { Grades } from '../../shared/interface.js';
import { findFactionById, update } from './faction.controller.js';

const Rebar = useRebar();

/**
 * Returns the next highest rank from the 'owner' rank.
 *
 */
export async function getFactionRankBelowHighest(factionId: string) {
    const faction = findFactionById(factionId);
    // Descending Order. Starts at 99
    const ranks = faction.grades.sort((a, b) => {
        return b.permissionLevel - a.permissionLevel;
    });

    return ranks[1] ? ranks[1] : ranks[0];
}

export async function getRankWithHighestWeight(factionId: string) {
    const faction = findFactionById(factionId);
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
export async function getFactionMemberRank(factionId: string, characterId: number): Promise<Grades> | null {
    const faction = findFactionById(factionId);
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
export async function getRankWithLowestWeight(factionId: string): Promise<Grades> {
    const faction = findFactionById(factionId);

    let lowestRank = faction.grades[0];

    for (let i = 1; i < faction.grades.length; i++) {
        const grade = faction.grades[i];
        if (grade.permissionLevel < lowestRank.permissionLevel) {
            lowestRank = grade;
        }
    }

    return lowestRank;
}

/**
 * Check if a rank is above another rank
 *
 */
export async function isRankAbove(factionId: string, _rank: string, _vsRank: string): Promise<boolean> {
    const faction = findFactionById(factionId);
    const rank = faction.grades.find((r) => r.gradeId === _rank);
    const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
    return rank.permissionLevel > vsRank.permissionLevel ? true : false;
}

/**
 * Check if a rank is below another rank
 *
 */
export async function isRankBelow(factionId: string, _rank: string, _vsRank: string): Promise<boolean> {
    const faction = findFactionById(factionId);
    const rank = faction.grades.find((r) => r.gradeId === _rank);
    const vsRank = faction.grades.find((r) => r.gradeId === _vsRank);
    return rank.permissionLevel < vsRank.permissionLevel ? true : false;
}

/**
 * Arbitrary way to set a rank for a character regardless of their standing.
 * Auto-saves
 */
export async function setCharacterRank(factionId: string, characterId: number, newRank: string): Promise<boolean> {
    const faction = findFactionById(factionId);
    const rankIndex = faction.grades.findIndex((x) => x.gradeId === newRank);
    if (rankIndex <= -1) {
        return false;
    }

    if (faction.grades[rankIndex].permissionLevel >= 99) {
        return false;
    }

    faction.members[characterId].gradeId = newRank;

    const didUpdate = await update(faction._id as string, 'members', {
        members: faction.members,
    });
    return didUpdate.status;
}

/**
 * Change a rank name based on rank uid
 * Auto-saves
 */
export async function updateRankName(factionId: string, rankUid: string, newName: string): Promise<boolean> {
    const faction = findFactionById(factionId);
    if (!faction) {
        return false;
    }
    const index = faction.grades.findIndex((r) => r.gradeId === rankUid);
    if (index <= -1) {
        return false;
    }

    faction.grades[index].name = newName;

    const didUpdate = await update(faction._id as string, 'grades', {
        grades: faction.grades,
    });

    return didUpdate.status;
}

/**
 * Removes a rank from the rank list for a faction.
 * Auto-saves
 */
export async function removeRank(factionId: string, rankUid: string): Promise<boolean> {
    const faction = findFactionById(factionId);
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

    const didUpdate = await update(faction._id as string, 'faction', {
        grades: faction.grades,
        members: faction.members,
    });
    return didUpdate.status;
}

/**
 * Adds a rank to the ranks list for a faction.
 * Auto-saves
 */
export async function addRank(
    factionId: string,
    newName: string,
    weight: number,
    onDutyPay: number,
    offDutyPay: number,
    maxOnDutyPay: number,
    maxOffDutyPay: number,
): Promise<boolean> {
    const faction = findFactionById(factionId);
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

    const didUpdate = await update(faction._id as string, 'grades', {
        grades: faction.grades,
    });

    return didUpdate.status;
}

export async function updateRankWeight(factionId: string, rankUid: string, weight: number): Promise<boolean> {
    const faction = findFactionById(factionId);
    if (weight <= -1 || weight >= 99) {
        return false;
    }

    const index = faction.grades.findIndex((r) => r.gradeId === rankUid);
    if (index <= -1) {
        return false;
    }

    faction.grades[index].permissionLevel = weight;
    const didUpdate = await update(faction._id as string, 'grades', {
        grades: faction.grades,
    });

    return didUpdate.status;
}

/**
 * Swap rank weights based on uids.
 *
 */
export async function swapRanks(factionId: string, swap: string, swapWith: string): Promise<boolean> {
    const faction = findFactionById(factionId);
    const fromIndex = faction.grades.findIndex((r) => r.gradeId === swap);
    const withIndex = faction.grades.findIndex((r) => r.gradeId === swapWith);

    if (fromIndex <= -1 || withIndex <= -1) {
        return false;
    }

    const fromWeight = faction.grades[fromIndex].permissionLevel;
    const withWeight = faction.grades[withIndex].permissionLevel;

    faction.grades[fromIndex].permissionLevel = withWeight;
    faction.grades[withIndex].permissionLevel = fromWeight;

    const didUpdate = await update(faction._id as string, 'grades', {
        grades: faction.grades,
    });

    return didUpdate.status;
}
