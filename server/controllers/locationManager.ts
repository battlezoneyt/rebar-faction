import { Locations } from '../../shared/interface.js';
import * as alt from 'alt-server';

// Update the type definition to include locationId
type LocationCallback = (player: alt.Player, factionId: string, locationId: string) => Promise<void> | void;

// Store callbacks in a map that's accessible throughout the module
const locationCallbacks: Map<string, LocationCallback> = new Map();

// Register callback function remains the same
export function registerFactionLocationCallback(locationType: keyof Locations, callback: LocationCallback) {
    locationCallbacks.set(locationType, callback);
}

// Update handle interaction function to pass locationId
export async function handleLocationInteraction(
    player: alt.Player,
    factionId: string,
    locationType: keyof Locations,
    locationId: string,
) {
    const callback = locationCallbacks.get(locationType);
    if (callback) {
        await callback(player, factionId, locationId);
    }
}

// Optional utility functions remain the same
export function removeLocationCallback(locationType: string) {
    locationCallbacks.delete(locationType);
}

export function hasLocationCallback(locationType: string): boolean {
    return locationCallbacks.has(locationType);
}
