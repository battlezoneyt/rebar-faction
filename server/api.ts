import { useApi } from '@Server/api/index.js';
import {
    addBank,
    addLocations,
    addMember,
    addPlayerToFactionBlips,
    addRank,
    getDuty,
    getFactionMemberRank,
    getFactionOwner,
    getFactionRankBelowHighest,
    getLocationsByType,
    getRankWithHighestWeight,
    getRankWithLowestWeight,
    isRankAbove,
    isRankBelow,
    kickMember,
    removeLocations,
    removePlayerFromFactionBlips,
    removeRank,
    setCharacterRank,
    setDuty,
    setOwner,
    subBank,
    swapRanks,
    updateRankName,
    updateRankWeight,
} from './src/functions.js';
import { create, findFactionById, findFactionByName, getAllFactions, remove, update } from './src/handlers.js';
import { useBlipGlobal } from './src/blip.js';

const API_NAME = 'rebar-faction-api';

function useFactionAPI() {
    const handlers = {
        setFactionOwner: setOwner,
        getFactionOwner: getFactionOwner,
        nextHigherRankThanOwner: getFactionRankBelowHighest,
        getHighestRankWeight: getRankWithHighestWeight,
        getFactionMemberRank: getFactionMemberRank,
        getLowestRankWeight: getRankWithLowestWeight,
        isRankAbove: isRankAbove,
        isRankBelow: isRankBelow,
        addFactionBank: addBank,
        subFactionBank: subBank,
        setFactionMemberRank: setCharacterRank,
        addFactionMember: addMember,
        removeFactionMember: kickMember,
        updateRankName: updateRankName,
        addRank: addRank,
        removeRank: removeRank,
        addLocations: addLocations,
        removeLocations: removeLocations,
        getLocationsByType: getLocationsByType,
        updateRankWeight: updateRankWeight,
        swapRanks: swapRanks,
        getDuty: getDuty,
        setDuty: setDuty,
        addPlayerBlips: addPlayerToFactionBlips,
        removePlayerBlips: removePlayerFromFactionBlips,
    };

    const functions = {
        createFaction: create,
        removeFaction: remove,
        updateFaction: update,
        findFactionById: findFactionById,
        findFactionByName: findFactionByName,
        getAllFactions: getAllFactions,
    };

    const blips = {
        useBlipGlobalLocal: useBlipGlobal,
    };

    return {
        handlers,
        functions,
        blips,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useFactionAPI>;
    }
}

useApi().register(API_NAME, useFactionAPI());
