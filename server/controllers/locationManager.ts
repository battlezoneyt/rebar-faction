import * as alt from 'alt-server';

// Type definition
type LocationCallback = (player: alt.Player) => Promise<void> | void;

// Store callbacks in a map that's accessible throughout the module
const locationCallbacks: Map<string, LocationCallback> = new Map();

// Register callback function
export function registerFactionLocationCallback(locationType: string, callback: LocationCallback) {
    locationCallbacks.set(locationType, callback);
}

// Handle interaction function
export async function handleLocationInteraction(player: alt.Player, locationType: string) {
    const callback = locationCallbacks.get(locationType);
    if (callback) {
        await callback(player);
    }
}

// Optional utility functions
export function removeLocationCallback(locationType: string) {
    locationCallbacks.delete(locationType);
}

export function hasLocationCallback(locationType: string): boolean {
    return locationCallbacks.has(locationType);
}
