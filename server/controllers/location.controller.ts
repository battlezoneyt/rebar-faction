import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { JobLocal, Locations } from '../../shared/interface.js';
import { findFactionById, update } from './faction.controller.js';

const Rebar = useRebar();

/**
 * Adds Locations based on Location Interface Type.
 * Auto-saves
 */
export async function addLocations(
    player: alt.Player,
    factionId: string,
    locationType: keyof Locations,
    locationName: string,
    pos: alt.Vector3,
    gradeId: string,
    sprite?: number,
    color?: number,
    parkingSpots?: Array<{ pos: alt.Vector3; rot: alt.Vector3 }>,
): Promise<boolean> {
    const factionData = findFactionById(factionId);
    if (!factionData) return false;
    if (!factionData.locations) {
        factionData.locations = {};
    }
    if (!factionData.locations[locationType]) {
        factionData.locations[locationType] = [];
    }

    const existingLocation = factionData.locations[locationType].find((r) => r.locationName === locationName);
    if (existingLocation) return false;

    // if (factionData.locations != undefined) {
    //     if (factionData.locations[locationType] != undefined) {
    //         if (factionData.locations[locationType].length > 0) {
    //             const index = factionData.locations[locationType].findIndex((r) => r.locationName != locationName);
    //             if (index <= -1) {
    //                 return false;
    //             }
    //         }
    //     } else {
    //         factionData.locations[locationType] = [];
    //     }
    // } else {
    //     factionData.locations = {};
    // }
    let location: JobLocal = {
        locationId: Rebar.utility.sha256Random(JSON.stringify(factionData.grades)),
        locationName: locationName,
        pos: pos,
        gradeId: gradeId,
        parkingSpots: parkingSpots,
        sprite: sprite | 1,
        color: color | 1,
    };
    try {
        factionData.locations[locationType].push(location);
    } catch (err) {
        console.log(err);
    }
    const didUpdate = await update(factionData._id as string, 'locations', {
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
export async function removeLocations(
    player: alt.Player,
    factionId: string,
    locationType: keyof Locations,
    locationId: string,
): Promise<boolean> {
    const faction = findFactionById(factionId);
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

    const didUpdate = await update(faction._id as string, 'locations', {
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
export async function getLocationsByType(factionId: string, locationType: string): Promise<Array<JobLocal>> {
    const faction = findFactionById(factionId);
    return faction.locations[locationType];
}
