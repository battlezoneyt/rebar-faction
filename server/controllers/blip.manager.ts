// In blip.manager.ts
import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import {
    onLocationChange,
    LocationChangeEvent,
    getLocationsByType,
    getFactionLocations,
} from './location.controller.js';
import { getDuty, onDutyChange } from './duty.controller.js';
import { BlipColor } from '@Shared/types/blip.js';
import { MarkerType } from '@Shared/types/marker.js';
import { Character } from '@Shared/types/index.js';
import { Locations } from '../../shared/interface.js';
import { BLIP_SETTINGS } from '../../shared/config.js';
import { getAllFactions } from './faction.controller.js';
import {
    FactionMemberAddEvent,
    FactionMemberKickEvent,
    getMemberGrade,
    onMemberAdd,
    onMemberKick,
} from './member.controller.js';
import { handleLocationInteraction } from './locationManager.js';
import { isRankAbove, onRankChange } from './grade.controller.js';

const Rebar = useRebar();
const getter = Rebar.get.usePlayerGetter();

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
                if (!char || char.faction !== factionId) return null;
                if (locationType === 'dutyLocations') {
                    addLocationBlips(player, factionId, char.id, location, locationType);
                } else {
                    const isOnDuty = await getDuty(char.faction, char.id);
                    if (isOnDuty) {
                        addLocationBlips(player, factionId, char.id, location, locationType);
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

        playerBlipMap.delete(locationId);
    }
}

async function addLocationBlips(
    player: alt.Player,
    factionId: string,
    characterId: number,
    location: any,
    locationType: keyof Locations,
) {
    try {
        if (!player?.valid) return;
        const memberRankId = await getMemberGrade(factionId, characterId);
        const hasPermission = await isRankAbove(factionId, memberRankId, location.gradeId);
        if (!hasPermission) {
            return; // Skip creating blips if permission check fails
        }
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

        // Create blip with error handling
        let locationBlip;
        try {
            locationBlip = Rebar.controllers.useBlipLocal(player, {
                pos: location.pos,
                color: location.color || blipSettings.color,
                sprite: location.sprite || blipSettings.sprite,
                shortRange: true,
                text: `${location.locationName}`,
            });
        } catch (error) {
            console.error(`Failed to create blip for ${location.locationName}:`, error);
        }

        // Create marker with error handling
        let locationMarker;
        try {
            locationMarker = Rebar.controllers.useMarkerLocal(player, {
                pos: new alt.Vector3(location.pos.x, location.pos.y, location.pos.z + 1),
                color: blipSettings.markerColor || new alt.RGBA(0, 50, 200, 255),
                scale: new alt.Vector3(1, 1, 1),
                type: blipSettings.markerType || MarkerType.CHEVRON_UP_SINGLE,
            });
        } catch (error) {
            console.error(`Failed to create marker for ${location.locationName}:`, error);
        }

        // Create interaction with error handling
        let interaction;
        try {
            interaction = Rebar.controllers.useInteractionLocal(player, location.locationName, 'Cylinder', [
                location.pos.x,
                location.pos.y,
                location.pos.z - 1,
                3,
                3,
            ]);

            interaction.on(async (player: alt.Player) => {
                await handleLocationInteraction(player, locationType);
            });
            interaction.onEnter((player: alt.Player) => {
                NotificationAPI.textLabel.create(player, {
                    keyToPress: 'E',
                    label: `${blipSettings.interactionPrefix || ''} ${location.locationName}`,
                });
            });

            interaction.onLeave((player: alt.Player) => {
                NotificationAPI.textLabel.remove(player);
            });
        } catch (error) {
            console.error(`Failed to create interaction for ${location.locationName}:`, error);
        }

        // Store all elements for this location
        playerBlipMap.set(location.locationId, {
            blip: locationBlip,
            marker: locationMarker,
            interaction: interaction,
        });
    } catch (error) {
        console.error(`Failed to add location blips:`, error);
    }
}

// Helper function to get blip settings based on location type
function getBlipSettingsForLocationType(locationType: keyof Locations) {
    return BLIP_SETTINGS[locationType] || BLIP_SETTINGS.dutyLocations;
}

function cleanupAllBlips() {
    // Cleanup player-specific blips
    cleanupGlobalJobBlips();
    alt.Player.all.forEach((player) => {
        cleanupPlayerLocationBlips(player);
    });
}

function cleanupPlayerLocationBlips(player: alt.Player) {
    const playerBlipMap = playerLocationBlips.get(player);
    if (!playerBlipMap) return;

    for (const { blip, marker, interaction } of playerBlipMap.values()) {
        [blip, marker, interaction].forEach((item) => item?.destroy?.());
    }

    playerBlipMap.clear();
    playerLocationBlips.delete(player);
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

// Handle duty state changes
onDutyChange(async ({ player, factionId, isOnDuty }) => {
    updateLocationBlipsForPlayer(player, factionId, isOnDuty, false, true);
});

// Export functions for use in other files
export async function updateLocationBlipsForPlayer(
    player: alt.Player,
    factionId: string,
    isOnDuty: boolean,
    forceRefresh: boolean = false,
    skipDutyLocations: boolean = false,
) {
    // Clean up existing blips if forcing refresh
    if (forceRefresh) {
        cleanupPlayerLocationBlips(player);
    }

    // Get all faction locations
    const locations = await getFactionLocations(factionId);
    if (!locations) return;
    const character = Rebar.document.character.useCharacter(player);
    if (!character) return;
    // Initialize blips based on duty status
    for (const locationType of Object.keys(locations) as Array<keyof Locations>) {
        if (skipDutyLocations && locationType === 'dutyLocations') continue;

        const locationList = locations[locationType];
        if (!Array.isArray(locationList)) continue;

        for (const location of locationList) {
            if (isOnDuty || locationType === 'dutyLocations') {
                // Other locations only visible when on duty
                addLocationBlips(player, factionId, character?.get().id, location, locationType);
            } else {
                // Clean up duty locations when off duty
                removeLocationBlips(player, location.locationId);
            }
        }
    }
}

//This funciton is for later if we add faction edit locaiton feature
// export async function updateFactionBlips(factionId: string) {
//     const onlinePlayers = alt.Player.all.filter((p) => {
//         const character = Rebar.document.character.useCharacter(p);
//         return character && character.get().faction === factionId;
//     });

//     for (const player of onlinePlayers) {
//         const character = Rebar.document.character.useCharacter(player);
//         if (character) {
//             const isOnDuty = await getDuty(factionId, character.get().id);
//             await updateLocationBlipsForPlayer(player, factionId, isOnDuty, true);
//         }
//     }
// }

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

async function handleFactionMemberAdd(event: FactionMemberAddEvent) {
    const { player, factionId } = event;

    // Clean up any existing blips for the player
    cleanupPlayerLocationBlips(player);

    // Initialize new blips for the player with their new faction
    const character = Rebar.document.character.useCharacter(player);
    if (!character?.get()?.faction) return;
    const isOnDuty = await getDuty(factionId, character.get().id);
    if (isOnDuty !== undefined) {
        await updateLocationBlipsForPlayer(player, factionId, isOnDuty || false);
    }
}

async function handleFactionMemberKick(event: FactionMemberKickEvent) {
    const { player } = event;
    // Clean up all faction-related blips for the kicked player
    cleanupPlayerLocationBlips(player);
}

onMemberAdd(handleFactionMemberAdd);
onMemberKick(handleFactionMemberKick);
onRankChange(async (characterId, factionId, oldRank, newRank) => {
    if (!characterId || !factionId) return;
    const player = Rebar.get.usePlayerGetter().byCharacter(characterId);
    if (!player) return;
    const isOnDuty = await getDuty(factionId, characterId);
    if (isOnDuty !== undefined) {
        await updateLocationBlipsForPlayer(player, factionId, isOnDuty || false, true);
    }
});
