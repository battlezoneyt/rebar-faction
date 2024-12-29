import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { JobLocal, Locations } from '../../shared/interface.js';
import { findFactionById, update } from './faction.controller.js';
import { VEHICLE_TYPES } from '@Plugins/rebar-vehicle/shared/interface.js';

const Rebar = useRebar();

export interface LocationChangeEvent {
    player: alt.Player;
    factionId: string;
    locationType: keyof Locations;
    location: JobLocal;
    action: 'add' | 'remove';
}

type LocationChangeCallback = (event: LocationChangeEvent) => void;
const locationChangeHandlers = new Set<LocationChangeCallback>();

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
    vehicleType?: keyof VEHICLE_TYPES,
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

    let location: JobLocal = {
        locationId: Rebar.utility.sha256Random(JSON.stringify(factionData.grades)),
        locationName: locationName,
        pos: pos,
        gradeId: gradeId,
        parkingSpots: parkingSpots,
        sprite: sprite || 1,
        color: color || 1,
    };

    try {
        factionData.locations[locationType].push(location);

        const didUpdate = await update(factionData._id as string, 'locations', {
            locations: factionData.locations,
        });

        if (didUpdate.status) {
            // Trigger location change event
            triggerLocationChange({
                player,
                factionId,
                locationType,
                location,
                action: 'add',
            });
        }

        return didUpdate.status;
    } catch (err) {
        console.log(err);
        return false;
    }
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

    const locationToRemove = faction.locations[locationType].find((r) => r.locationId === locationId);
    if (!locationToRemove) return false;

    try {
        faction.locations[locationType] = faction.locations[locationType].filter(
            (location) => location.locationId !== locationId,
        );

        const didUpdate = await update(faction._id as string, 'locations', {
            locations: faction.locations,
        });

        if (didUpdate.status) {
            // Trigger location change event
            triggerLocationChange({
                player,
                factionId,
                locationType,
                location: locationToRemove,
                action: 'remove',
            });
        }

        return didUpdate.status;
    } catch (err) {
        console.log(err);
        return false;
    }
}

/**
 * Remove Locations based on Location Interface Type.
 * Auto-saves
 */
export async function getLocationsByType(factionId: string, locationType: keyof Locations): Promise<JobLocal[]> {
    const faction = findFactionById(factionId);
    return faction.locations[locationType];
}

export async function getLocationsById(
    factionId: string,
    locationType: keyof Locations,
    locationId: string,
): Promise<JobLocal> {
    const faction = findFactionById(factionId);
    return faction.locations[locationType].find((location) => location.locationId === locationId);
}

export async function getFactionLocations(factionId: string): Promise<Locations> {
    const faction = findFactionById(factionId);
    return faction.locations;
}

export function onLocationChange(callback: LocationChangeCallback): void {
    locationChangeHandlers.add(callback);
}

export function offLocationChange(callback: LocationChangeCallback): void {
    locationChangeHandlers.delete(callback);
}

function triggerLocationChange(event: LocationChangeEvent): void {
    locationChangeHandlers.forEach((handler) => {
        handler(event);
    });
}
