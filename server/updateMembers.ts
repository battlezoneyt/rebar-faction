import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import { MarkerType } from '../../../main/shared/types/marker.js';
import { BlipColor } from '@Shared/types/blip.js';
import { Factions, JobLocal } from '../shared/interface.js';
import { useFactionFunctions } from './functions.js';
import { Character } from '@Shared/types/character.js';
import * as Utility from '@Shared/utility/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const messenger = Rebar.messenger.useMessenger();
const faction = await api.getAsync('faction-functions-api');
const factionUpdate = await api.getAsync('faction-handlers-api');
const getter = Rebar.get.usePlayerGetter();
const NotificationAPI = await Rebar.useApi().getAsync('ascended-notification-api');
const jobLocations: { joblocation: JobLocal[]; factionId: string }[] = [];
const createdBlips = new Map<string, any>();

const { registerContext } = await api.getAsync('g-lib-api');

const factionMarkers = {};

let oldMembers: { _id: string; faction: string }[] = [];

const factionBlips = new Map<string, Map<alt.Player, any>>(); // Map of factions to on-duty players and their blips
const lastPositions = new WeakMap<alt.Player, alt.Vector3>();
const playerMarkers = new Map<alt.Player, any[]>();

async function syncJob(player: alt.Player, factionId: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        if (!document || !character || !document.faction) return;
        const duty = await faction.getDuty(factionId, document.id);

        const locationTypes = [
            'dutyLocations',
            'storageLocations',
            'vehicleShopLoc',
            'bossMenuLoc',
            'factionShopLoc',
            'clothingLoc',
        ];

        const locations = await Promise.all(
            locationTypes.map((type) => faction.getLocationsByType(factionId, type) || []),
        );

        const [
            dutyLocations,
            storageLocation,
            vehicleShopLocation,
            bossMenuLoccation,
            factionShopLocation,
            clothingLocation,
        ] = locations;
        if (document.faction === factionId) {
            if (dutyLocations) {
                await createMarkers(
                    player,
                    document.id,
                    factionId,
                    'dutyMarkers',
                    dutyLocations,
                    'Duty',
                    'BLUE',
                    351,
                    handleDutyInteraction,
                );
            }

            if (duty) {
                await addPlayerToFactionBlips(player, factionId);

                if (storageLocation) {
                    await createMarkers(
                        player,
                        document.id,
                        factionId,
                        'storageMarkers',
                        storageLocation,
                        'Storage',
                        'BLUE',
                        351,
                        handleStorageInteraction,
                    );
                }
                if (vehicleShopLocation) {
                    await createMarkers(
                        player,
                        document.id,
                        factionId,
                        'vehShopMarkers',
                        vehicleShopLocation,
                        'Vehicle Shop',
                        'BLUE',
                        351,
                        handleVehicleShopInteraction,
                    );
                }
                if (bossMenuLoccation) {
                    await createMarkers(
                        player,
                        document.id,
                        factionId,
                        'bossMenuMarkers',
                        bossMenuLoccation,
                        'Boss Menu',
                        'BLUE',
                        351,
                    );
                }
                if (factionShopLocation) {
                    await createMarkers(
                        player,
                        document.id,
                        factionId,
                        'shopMarkers',
                        factionShopLocation,
                        'Shop',
                        'BLUE',
                        351,
                    );
                }
                if (clothingLocation) {
                    await createMarkers(
                        player,
                        document.id,
                        factionId,
                        'clothingMarkers',
                        clothingLocation,
                        'Clothing',
                        'BLUE',
                        351,
                    );
                }
            } else {
                await destroyMarkers(player, document.id, factionId, 'storageMarkers');
                await destroyMarkers(player, document.id, factionId, 'vehShopMarkers');
                await destroyMarkers(player, document.id, factionId, 'bossMenuMarkers');
                await destroyMarkers(player, document.id, factionId, 'shopMarkers');
                await destroyMarkers(player, document.id, factionId, 'clothingMarkers');
                await removePlayerFromFactionBlips(player, factionId);
            }
        } else {
            await destroyAllMarkers(player, document.id, factionId);
        }
    } catch (error) {
        console.error('Error in syncJob:', error);
    }
}

async function createMarkers(
    player: alt.Player,
    characterId: number,
    factionId: string,
    markerType: string,
    locations: any[],
    text: string,
    color: keyof typeof BlipColor,
    sprite: number,
    interactionHandler?: (player: alt.Player, destroy) => Promise<void>,
) {
    const playerId = characterId;
    // Ensure the structure is initialized
    ensureFactionMarkersStructure(factionId, playerId, markerType);

    // Check for existing markers and destroy them
    if (markerType === 'dutyMarkers' && factionMarkers[factionId][playerId][markerType].length > 0) {
        return;
    }
    if (markerType !== 'dutyMarkers') {
        await destroyMarkers(player, characterId, factionId, markerType);
    }
    if (!locations || locations.length === 0) {
        return;
    }
    if (factionMarkers[factionId][playerId][markerType].length > 0) {
        if (markerType !== 'dutyMarkers') await destroyMarkers(player, characterId, factionId, markerType);
    }

    // Validate locations
    if (!locations || locations.length === 0) {
        return;
    }

    locations.forEach((location) => {
        const position = location.pos;

        const marker = Rebar.controllers.useMarkerLocal(player, {
            pos: new alt.Vector3(position.x, position.y, position.z + 1),
            color: new alt.RGBA(0, 50, 200, 255),
            scale: new alt.Vector3(1, 1, 1),
            type: MarkerType.CHEVRON_UP_SINGLE,
        });

        const blip = Rebar.controllers.useBlipLocal(player, {
            pos: new alt.Vector3(position),
            color,
            sprite,
            shortRange: true,
            text,
        });

        const interaction = Rebar.controllers.useInteractionLocal(player, location.locationName, 'Cylinder', [
            position.x,
            position.y,
            position.z - 1,
            3,
            3,
        ]);

        if (interactionHandler) {
            interaction.on(interactionHandler);
        }

        interaction.onEnter((player) => {
            NotificationAPI.textLabel.create(player, { keyToPress: 'E', label: text });
        });
        interaction.onLeave((player) => {
            NotificationAPI.textLabel.remove(player);
        });

        // Add valid markers to the array
        if (marker && blip && interaction) {
            factionMarkers[factionId][playerId][markerType].push(marker, blip, interaction);
        }
    });
}

function ensureFactionMarkersStructure(factionId: string, playerId: number, markerType: string) {
    if (!factionMarkers[factionId]) factionMarkers[factionId] = {};
    if (!factionMarkers[factionId][playerId]) factionMarkers[factionId][playerId] = {};
    if (!factionMarkers[factionId][playerId][markerType]) {
        factionMarkers[factionId][playerId][markerType] = [];
    }
}

async function destroyMarkers(player: alt.Player, characterId: number, factionId: string, markerType: string) {
    const playerId = characterId;

    try {
        ensureFactionMarkersStructure(factionId, playerId, markerType);

        const markers = factionMarkers[factionId][playerId][markerType];
        if (markers && markers.length > 0) {
            for (let i = markers.length - 1; i >= 0; i--) {
                const item = markers[i];
                if (item && typeof item.destroy === 'function' && !item.destroyed) {
                    try {
                        item.destroy();
                    } catch (err) {
                        console.warn('Failed to destroy marker:', err);
                    }
                }
                // Remove the marker from the array
                markers.splice(i, 1);
            }
        }

        NotificationAPI.textLabel.remove(player);
        // Reset the array

        factionMarkers[factionId][playerId][markerType] = [];
    } catch (error) {
        console.error(`Error in destroyMarkers(${markerType}):`, error);
    }
}

async function destroyAllMarkers(player: alt.Player, playerId: number, factionId: string) {
    try {
        if (factionMarkers[factionId] && factionMarkers[factionId][playerId]) {
            if (getter.isValid(player)) {
                Object.keys(factionMarkers[factionId][playerId]).forEach((markerType) => {
                    factionMarkers[factionId][playerId][markerType].forEach((item) => {
                        if (item) item.destroy();
                    });
                    delete factionMarkers[factionId][playerId][markerType]; // Remove the markerType
                });
            } else {
                delete factionMarkers[factionId][playerId]; // Remove the player
            }
            NotificationAPI.textLabel.remove(player);
        }

        // Remove the faction entry if no players remain
        if (factionMarkers[factionId] && Object.keys(factionMarkers[factionId]).length === 0) {
            delete factionMarkers[factionId];
        }
    } catch (error) {
        console.error('Error in destroyAllMarkers:', error);
    }
}

async function handleDutyInteraction(player: alt.Player, destroy) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        await faction.setDuty(document.faction, document.id);
    } catch (error) {
        console.error('Error in handleDutyInteraction:', error);
    }
}

async function handleStorageInteraction(player: alt.Player, destroy) {
    console.log('dsdas');
}
async function handleVehicleShopInteraction(player: alt.Player, destroy) {
    console.log('dsdssssssssssas');
}
export async function updateFactionMembers(factionId: string) {
    try {
        const factionData = await factionUpdate.findFactionById(factionId);

        const memberIdentifiers = Object.keys(factionData.members);
        if (!memberIdentifiers) return;

        for (let i = oldMembers.length - 1; i >= 0; i--) {
            const player = getter.byCharacter(parseInt(oldMembers[i]._id));
            if (!memberIdentifiers.includes(oldMembers[i]._id)) {
                await destroyAllMarkers(player, parseInt(oldMembers[i]._id), factionId);
                oldMembers.splice(i, 1);
            }
            if (!getter.isValid(player) && memberIdentifiers.includes(oldMembers[i]._id)) {
                await destroyAllMarkers(player, parseInt(oldMembers[i]._id), factionId);
                oldMembers.splice(i, 1);
            }
        }
        for (const memberId of memberIdentifiers) {
            const xPlayer = getter.byCharacter(parseInt(memberId));

            const oldMemberIndex = oldMembers.findIndex((f) => f._id === memberId);
            if (oldMemberIndex === -1) {
                if (xPlayer && Rebar.document.character.useCharacter(xPlayer).isValid()) {
                    oldMembers.push({ _id: memberId, faction: factionId });
                    syncJob(xPlayer, factionId);
                }
            } else {
                syncJob(xPlayer, factionId);
            }
        }
    } catch (error) {
        console.error('Error in updateFactionMembers:', error);
    }
}

factionUpdate.onUpdate(({ factionId, fieldName }) => {
    updateFactionMembers(factionId);
    if (fieldName === 'locations') {
        updateJobBlips();
    }
});

export async function updateJobBlips() {
    const allFactions: Factions[] = factionUpdate.getAllFactions();
    for (const data of allFactions) {
        const existingFaction = jobLocations.find((item) => item.factionId === data._id);
        console.log(`Processing faction: ${data.label} (ID: ${data._id})`);
        console.log(`Existing faction data:`, existingFaction);

        if (!existingFaction && data.locations.jobLocations) {
            console.log(`Adding new job locations for faction ${data.label}`);
            jobLocations.push({
                joblocation: data.locations.jobLocations,
                factionId: data._id,
            });

            for (const location of data.locations.jobLocations) {
                console.log(`Creating blip for new location:`, location);
                await createOrUpdateBlip(data._id, location, data.label);
            }
        } else if (existingFaction) {
            console.log(`Existing locations:`, existingFaction.joblocation);
            console.log(`New locations:`, data.locations.jobLocations);

            const removedLocations = existingFaction.joblocation.filter(
                (loc) => !data.locations.jobLocations.some((newLoc) => newLoc.locationId === loc.locationId),
            );
            console.log('Removed Locations:', removedLocations);

            for (const removedLocation of removedLocations) {
                await destroyBlip(data._id, removedLocation.locationId);
            }

            existingFaction.joblocation = existingFaction.joblocation.filter((loc) => !removedLocations.includes(loc));

            for (const newLocation of data.locations.jobLocations) {
                const existingLocation = existingFaction.joblocation.find(
                    (loc) => loc.locationId === newLocation.locationId,
                );

                if (!existingLocation) {
                    console.log(`Adding new location:`, newLocation);
                    existingFaction.joblocation.push(newLocation);
                    await createOrUpdateBlip(data._id, newLocation, data.label);
                } else if (hasLocationChanged(existingLocation, newLocation)) {
                    console.log(`Updating existing location:`, newLocation);
                    Object.assign(existingLocation, newLocation);
                    await createOrUpdateBlip(data._id, newLocation, data.label, true);
                }
            }
        }
    }
}

function destroyBlip(factionId: string, locationId: string) {
    const blipId = `${factionId}-${locationId}`;
    const blip = createdBlips.get(blipId);
    if (blip) {
        blip.destroy();
        createdBlips.delete(blipId); // Remove from the map
    }
}

// Function to compare two locations and detect changes
function hasLocationChanged(existing: JobLocal, updated: JobLocal): boolean {
    return (
        existing.pos.x !== updated.pos.x ||
        existing.pos.y !== updated.pos.y ||
        existing.pos.z !== updated.pos.z ||
        existing.sprite !== updated.sprite ||
        existing.color !== updated.color ||
        existing.parkingSpots?.length !== updated.parkingSpots?.length
    );
}

// Function to create a blip
function createOrUpdateBlip(factionId: string, location: JobLocal, label: string, update = false) {
    const blipId = `${factionId}-${location.locationId}`;

    if (!update) {
        // Create a new blip if it doesn't exist
        if (!createdBlips.has(blipId)) {
            const blip = Rebar.controllers.useBlipGlobal({
                pos: location.pos,
                color: location.color || 'BLUE',
                sprite: location.sprite || 351,
                shortRange: false,
                text: `${label}`,
            });

            // Store the created blip in the map
            createdBlips.set(blipId, blip);
        }
    } else {
        // Update the existing blip
        const blip = createdBlips.get(blipId);
        if (blip) {
            blip.update({
                pos: location.pos,
                color: location.color || 'BLUE',
                sprite: location.sprite || 351,
                shortRange: false,
                text: `${label}`,
            });
        }
    }
}

alt.on('rebar:playerCharacterBound', async (player: alt.Player, document: Character) => {
    if (document.faction) {
        updateFactionMembers(document.faction);
    }
});

alt.on('playerDisconnect', handleDisconnect);

async function handleDisconnect(player: alt.Player) {
    const character = Rebar.document.character.useCharacter(player);
    if (!character) return;
    const document = character.get();
    if (!document || !document.faction) return;
    if (document.faction) {
        await faction.setDuty(document.faction, document.id, false);
        removePlayerFromFactionBlips(player, document.faction);
    }
}

alt.setInterval(() => {
    factionBlips.forEach((blipMap, faction) => {
        blipMap.forEach((playerBlips, player) => {
            if (!player || !player.valid) {
                removePlayerFromFactionBlips(player, faction);
                return;
            }

            const lastPos = lastPositions.get(player);
            if (!lastPos || Utility.vector.distance(lastPos, player.pos) > 5) {
                lastPositions.set(player, player.pos);

                // Update the player's position for all on-duty players
                blipMap.forEach((otherBlips) => {
                    const blip = otherBlips.get(player);
                    if (blip) {
                        blip.update({ pos: player.pos });
                    }
                });
            }
        });
    });
}, 1000); // Adjust interval duration as needed

async function addPlayerToFactionBlips(player: alt.Player, faction: string) {
    if (!factionBlips.has(faction)) {
        factionBlips.set(faction, new Map());
    }
    const blipMap = factionBlips.get(faction);

    // Add the new player's blip for all other on-duty players
    blipMap.forEach((otherBlip, otherPlayer) => {
        const newBlip = Rebar.controllers.useBlipLocal(otherPlayer, {
            pos: player.pos,
            color: BlipColor.BLUE,
            sprite: 1,
            shortRange: false,
            text: `${player.name} (On Duty)`,
        });
        otherBlip.set(player, newBlip);
    });

    // Add all other players' blips to the new player's view
    const newPlayerBlips = new Map();
    blipMap.forEach((otherBlip, otherPlayer) => {
        const blip = Rebar.controllers.useBlipLocal(player, {
            pos: otherPlayer.pos,
            color: BlipColor.BLUE,
            sprite: 1,
            shortRange: false,
            text: `${otherPlayer.name} (On Duty)`,
        });
        newPlayerBlips.set(otherPlayer, blip);
    });

    // Add the new player to the faction blips map
    const selfBlip = Rebar.controllers.useBlipLocal(player, {
        pos: player.pos,
        color: BlipColor.BLUE,
        sprite: 1,
        shortRange: false,
        text: `${player.name} (On Duty)`,
    });
    blipMap.set(player, newPlayerBlips);
    newPlayerBlips.set(player, selfBlip);
}

async function removePlayerFromFactionBlips(player: alt.Player, faction: string) {
    const blipMap = factionBlips.get(faction);

    if (!blipMap) return;

    // Remove the player's blip from all other players
    blipMap.forEach((otherBlips, otherPlayer) => {
        const blip = otherBlips.get(player);
        if (blip) {
            blip.destroy();
            otherBlips.delete(player);
        }
    });

    // Remove all blips that the player sees
    const playerBlips = blipMap.get(player);
    if (playerBlips) {
        playerBlips.forEach((blip) => blip.destroy());
    }

    blipMap.delete(player);

    // Remove the faction entry if no players remain
    if (blipMap.size === 0) {
        factionBlips.delete(faction);
    }
}
