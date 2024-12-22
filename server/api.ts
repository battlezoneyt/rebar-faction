import { useApi } from '@Server/api/index.js';
import { addMember, getFactionOwner, kickMember, changeOwner } from './controllers/member.controller.js';
import {
    addRank,
    getFactionMemberRank,
    getFactionRankBelowHighest,
    getRankWithHighestWeight,
    getRankWithLowestWeight,
    isRankAbove,
    isRankBelow,
    removeRank,
    setCharacterRank,
    swapRanks,
    updateRankName,
    updateRankWeight,
} from './controllers/grade.controller.js';
import {
    addBank,
    create,
    findFactionById,
    findFactionByName,
    getAllFactions,
    remove,
    subBank,
    update,
} from './controllers/faction.controller.js';
import {
    addLocations,
    getFactionLocations,
    getLocationsByType,
    removeLocations,
} from './controllers/location.controller.js';
import { useBlipGlobal } from './controllers/blip.controller.js';
import {
    addPlayerToFactionBlips,
    getDuty,
    removePlayerFromFactionBlips,
    setDuty,
} from './controllers/duty.controller.js';
import { registerFactionLocationCallback } from './controllers/locationManager.js';

const API_NAME = 'rebar-faction-api';

function useFactionAPI() {
    const gradeHandlers = {
        nextHigherRankThanOwner: getFactionRankBelowHighest,
        getHighestRankWeight: getRankWithHighestWeight,
        getFactionMemberRank: getFactionMemberRank,
        getLowestRankWeight: getRankWithLowestWeight,
        isRankAbove: isRankAbove,
        isRankBelow: isRankBelow,
        setFactionMemberRank: setCharacterRank,
        updateRankName: updateRankName,
        addRank: addRank,
        removeRank: removeRank,
        swapRanks: swapRanks,
        updateRankWeight: updateRankWeight,
    };

    const factionHandlers = {
        createFaction: create,
        removeFaction: remove,
        updateFaction: update,
        findFactionById: findFactionById,
        findFactionByName: findFactionByName,
        getAllFactions: getAllFactions,
        addFactionBank: addBank,
        subFactionBank: subBank,
    };

    const locationHandlers = {
        addLocations: addLocations,
        removeLocations: removeLocations,
        getLocationsByType: getLocationsByType,
        getAllLocations: getFactionLocations,
    };

    const dutyHandlers = {
        getDuty: getDuty,
        setDuty: setDuty,
        addPlayerBlips: addPlayerToFactionBlips,
        removePlayerBlips: removePlayerFromFactionBlips,
    };

    const memberHandlers = {
        setFactionOwner: changeOwner,
        getFactionOwner: getFactionOwner,
        addFactionMember: addMember,
        removeFactionMember: kickMember,
    };

    const blipsHandlers = {
        useBlipGlobalLocal: useBlipGlobal,
    };

    const locationCallback = {
        onCallback: registerFactionLocationCallback,
    };

    return {
        gradeHandlers,
        factionHandlers,
        locationHandlers,
        dutyHandlers,
        memberHandlers,
        blipsHandlers,
    };
}

declare global {
    export interface ServerPlugin {
        [API_NAME]: ReturnType<typeof useFactionAPI>;
    }
}

useApi().register(API_NAME, useFactionAPI());
