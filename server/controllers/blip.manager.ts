// In blip.manager.ts
import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { onLocationChange, LocationChangeEvent, getLocationsByType } from './location.controller.js';
import { getDuty, onDutyChange } from './duty.controller.js';
import { BlipColor } from '@Shared/types/blip.js';
import { MarkerType } from '@Shared/types/marker.js';
import { Character } from '@Shared/types/index.js';
import { Locations } from '../../shared/interface.js';
import { getAllFactions } from './faction.controller.js';

const Rebar = useRebar();
const NotificationAPI = await Rebar.useApi().getAsync('ascended-notification-api');

// Store all types of location blips for each player
const playerLocationBlips = new Map<
    alt.Player,
    Map<
        string,
        {
            blip: any;
            marker: any;
            interaction: any;
        }
    >
>();

const globalJobBlips = new Map<string, any>();

// Define which location types to show when on duty
const LocationTypes: (keyof Locations)[] = [
    'jobLocations',
    'dutyLocations',
    'bossMenuLoc',
    'factionShopLoc',
    'storageLocations',
    'vehicleShopLoc',
    'clothingLoc',
];

// Initialize global job blips
async function initializeGlobalJobBlips(factionId: string) {
    const jobLocations = await getLocationsByType(factionId, 'jobLocations');
    if (!jobLocations) return;

    jobLocations.forEach((location) => {
        addGlobalJobBlip(location);
    });
}

export async function initializeAllGlobalJobBlips() {
    const factions = getAllFactions();
    for (const faction of factions) {
        const jobLocations = await getLocationsByType(faction._id, 'jobLocations');
        if (jobLocations) {
            jobLocations.forEach((location) => {
                addGlobalJobBlip(location);
            });
        }
    }
}

function addGlobalJobBlip(location: any) {
    // // Remove existing global blip if it exists
    // if (globalJobBlips.has(location.locationId)) {
    //     removeGlobalJobBlip(location.locationId);
    // }

    // Create global blip
    const jobBlip = Rebar.controllers.useBlipGlobal({
        pos: location.pos,
        color: location.color || BlipColor.YELLOW,
        sprite: location.sprite || 408, // Or whatever sprite you want for job locations
        shortRange: true,
        text: `Job: ${location.locationName}`,
    });

    // Store only the blip
    globalJobBlips.set(location.locationId, jobBlip);
}

function removeGlobalJobBlip(locationId: string) {
    const blip = globalJobBlips.get(locationId);
    if (blip && blip.destroy) {
        blip.destroy();
        globalJobBlips.delete(locationId);
    }
}

// Initialize all location blips for a player based on duty status
async function initializeAllLocationBlips(player: alt.Player, factionId: string, isOnDuty: boolean) {
    // Initialize player-specific location blips
    if (!playerLocationBlips.has(player)) {
        playerLocationBlips.set(player, new Map());
    }

    // Get and create blips for each location type
    const dutyLocations = await getLocationsByType(factionId, 'dutyLocations');
    if (dutyLocations) {
        dutyLocations.forEach((location) => {
            addLocationBlips(player, location, 'dutyLocations');
        });
    }

    if (isOnDuty) {
        // Add other location types when on duty
        for (const locationType of LocationTypes) {
            const locations = await getLocationsByType(factionId, locationType);
            if (locations) {
                locations.forEach((location) => {
                    addLocationBlips(player, location, locationType);
                });
            }
        }
    }
}

// Handle duty state changes
onDutyChange(async ({ player, factionId, isOnDuty }) => {
    await initializeAllLocationBlips(player, factionId, isOnDuty);
});

// Handle location changes
async function handleLocationBlips({ player, factionId, locationType, location, action }: LocationChangeEvent) {
    // Handle global job locations separately
    if (locationType === 'jobLocations') {
        if (action === 'remove') {
            await removeGlobalJobBlip(location.locationId);
        } else {
            await addGlobalJobBlip(location);
        }
        return;
    }

    // Get all online players first
    const onlinePlayers = await Promise.all(
        alt.Player.all.map(async (p) => {
            const character = Rebar.document.character.useCharacter(p);
            if (!character) return null;

            const char = character.get();
            if (!char || char.faction !== factionId) return null;

            if (locationType === 'dutyLocations') {
                return p;
            } else {
                const isOnDuty = await getDuty(char.faction, char.id);
                return isOnDuty ? p : null;
            }
        }),
    );

    // Filter out null values and process each player
    const validPlayers = onlinePlayers.filter((p): p is alt.Player => p !== null);

    // Process each player sequentially to avoid race conditions
    for (const player of validPlayers) {
        if (action === 'remove') {
            removeLocationBlips(player, location.locationId);
        } else {
            // Double check duty status before adding non-duty locations
            const character = Rebar.document.character.useCharacter(player);
            if (character) {
                const char = character.get();
                if (locationType === 'dutyLocations') {
                    addLocationBlips(player, location, locationType);
                } else {
                    const isOnDuty = await getDuty(char.faction, char.id);
                    if (isOnDuty) {
                        addLocationBlips(player, location, locationType);
                    }
                }
            }
        }
    }
}

function removeLocationBlips(player: alt.Player, locationId: string) {
    const playerBlipMap = playerLocationBlips.get(player);
    if (!playerBlipMap) return;

    const locationBlips = playerBlipMap.get(locationId);
    if (locationBlips) {
        if (locationBlips.blip && locationBlips.blip.destroy) locationBlips.blip.destroy();
        if (locationBlips.marker && locationBlips.marker.destroy) locationBlips.marker.destroy();
        if (locationBlips.interaction && locationBlips.interaction.destroy) locationBlips.interaction.destroy();
        NotificationAPI.textLabel.remove(player);

        playerBlipMap.delete(locationId);
    }
}

function addLocationBlips(player: alt.Player, location: any, locationType: keyof Locations) {
    if (!playerLocationBlips.has(player)) {
        playerLocationBlips.set(player, new Map());
    }

    const playerBlipMap = playerLocationBlips.get(player)!;

    // Remove existing blips for this location if they exist
    if (playerBlipMap.has(location.locationId)) {
        removeLocationBlips(player, location.locationId);
    }

    // Get blip settings based on location type
    const blipSettings = getBlipSettingsForLocationType(locationType);

    // Create blip
    const locationBlip = Rebar.controllers.useBlipLocal(player, {
        pos: location.pos,
        color: location.color || blipSettings.color,
        sprite: location.sprite || blipSettings.sprite,
        shortRange: true,
        text: `${location.locationName}`,
    });

    // Create marker
    const locationMarker = Rebar.controllers.useMarkerLocal(player, {
        pos: new alt.Vector3(location.pos.x, location.pos.y, location.pos.z + 1),
        color: blipSettings.markerColor || new alt.RGBA(0, 50, 200, 255),
        scale: new alt.Vector3(1, 1, 1),
        type: blipSettings.markerType || MarkerType.CHEVRON_UP_SINGLE,
    });

    // Create interaction
    const interaction = Rebar.controllers.useInteractionLocal(player, location.locationName, 'Cylinder', [
        location.pos.x,
        location.pos.y,
        location.pos.z - 1,
        3,
        3,
    ]);

    interaction.onEnter((player) => {
        NotificationAPI.textLabel.create(player, {
            keyToPress: 'E',
            label: `${blipSettings.interactionPrefix || ''} ${location.locationName}`,
        });
    });

    interaction.onLeave((player) => {
        NotificationAPI.textLabel.remove(player);
    });

    // Store all elements for this location
    playerBlipMap.set(location.locationId, {
        blip: locationBlip,
        marker: locationMarker,
        interaction: interaction,
    });
}

// Helper function to get blip settings based on location type
function getBlipSettingsForLocationType(locationType: keyof Locations) {
    const settings = {
        dutyLocations: {
            color: BlipColor.BLUE,
            sprite: 1,
            markerColor: new alt.RGBA(0, 50, 200, 255),
            markerType: MarkerType.CHEVRON_UP_SINGLE,
            interactionPrefix: 'Duty Point:',
        },
        jobLocations: {
            color: BlipColor.GREEN,
            sprite: 175,
            markerColor: new alt.RGBA(0, 200, 0, 255),
            markerType: MarkerType.CHEVRON_UP_SINGLE,
            interactionPrefix: 'Armor:',
        },
        bossMenuLoc: {
            color: BlipColor.RED,
            sprite: 110,
            markerColor: new alt.RGBA(200, 0, 0, 255),
            markerType: MarkerType.CHEVRON_UP_SINGLE,
            interactionPrefix: 'Weapons:',
        },
        factionShopLoc: {
            color: BlipColor.YELLOW,
            sprite: 50,
            markerColor: new alt.RGBA(200, 200, 0, 255),
            markerType: MarkerType.CAR,
            interactionPrefix: 'Garage:',
        },
        storageLocations: {
            color: BlipColor.ORANGE,
            sprite: 68,
            markerColor: new alt.RGBA(200, 100, 0, 255),
            markerType: MarkerType.CAR,
            interactionPrefix: 'Impound:',
        },
        vehicleShopLoc: {
            color: BlipColor.ORANGE,
            sprite: 68,
            markerColor: new alt.RGBA(200, 100, 0, 255),
            markerType: MarkerType.CAR,
            interactionPrefix: 'Impound:',
        },
        clothingLoc: {
            color: BlipColor.ORANGE,
            sprite: 68,
            markerColor: new alt.RGBA(200, 100, 0, 255),
            markerType: MarkerType.CAR,
            interactionPrefix: 'Impound:',
        },
    };

    return settings[locationType] || settings.dutyLocations;
}

function cleanupAllBlips() {
    // Cleanup player-specific blips
    cleanupGlobalJobBlips();
    alt.Player.all.forEach((player) => {
        cleanupPlayerLocationBlips(player);
    });
}

export async function updateGlobalJobBlips(factionId: string) {
    await initializeGlobalJobBlips(factionId);
}

function cleanupPlayerLocationBlips(player: alt.Player) {
    const playerBlipMap = playerLocationBlips.get(player);
    if (playerBlipMap) {
        playerBlipMap.forEach(({ blip, marker, interaction }) => {
            if (blip && blip.destroy) blip.destroy();
            if (marker && marker.destroy) marker.destroy();
            if (interaction && interaction.destroy) interaction.destroy();
        });
        NotificationAPI.textLabel.remove(player);
        playerLocationBlips.delete(player);
    }
}

function cleanupGlobalJobBlips() {
    globalJobBlips.forEach((blip) => {
        if (blip && blip.destroy) blip.destroy();
    });
    globalJobBlips.clear();
}

// Subscribe to location changes
onLocationChange(handleLocationBlips);

// Handle player disconnect
alt.on('playerDisconnect', (player: alt.Player) => {
    cleanupPlayerLocationBlips(player);
});

// Export functions for use in other files
export async function updateLocationBlipsForPlayer(player: alt.Player, factionId: string, isOnDuty: boolean) {
    const playerBlipMap = playerLocationBlips.get(player);
    if (playerBlipMap) {
        playerBlipMap.forEach(({ blip, marker, interaction }) => {
            if (blip && blip.destroy) blip.destroy();
            if (marker && marker.destroy) marker.destroy();
            if (interaction && interaction.destroy) interaction.destroy();
        });
        NotificationAPI.textLabel.remove(player);
        playerLocationBlips.delete(player);
    }
    await initializeAllLocationBlips(player, factionId, isOnDuty);
}

// Handle character binding
alt.on('rebar:playerCharacterBound', async (player: alt.Player, document: Character) => {
    if (document.faction) {
        const isOnDuty = await getDuty(document.faction, document.id);
        await updateLocationBlipsForPlayer(player, document.faction, isOnDuty || false);
    }
});

// Handle faction join
export async function handlePlayerJoinFaction(player: alt.Player, factionId: string) {
    const character = Rebar.document.character.useCharacter(player);
    const isOnDuty = character ? (await getDuty(factionId, character.get().id)) || false : false;
    await updateLocationBlipsForPlayer(player, factionId, isOnDuty);
}
