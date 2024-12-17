import { useRebar } from '@Server/index.js';
import alt from 'alt-server';
import * as Utility from '@Shared/utility/index.js';
import { MarkerType } from '../../../main/shared/types/marker.js';
import { BlipColor } from '@Shared/types/blip.js';
import { JobLocal } from '../shared/interface.js';
import { useFactionFunctions } from './functions.js';
import { handleDutyInteraction, handleStorageInteraction, handleVehicleShopInteraction } from './intractionHandler.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const messenger = Rebar.messenger.useMessenger();
const faction = await api.getAsync('faction-functions-api');
const factionUpdate = await api.getAsync('faction-handlers-api');
const getter = Rebar.get.usePlayerGetter();
const NotificationAPI = await Rebar.useApi().getAsync('ascended-notification-api');

const markers = {
    textDutyLabel: [],
    dutyMarkers: [],
    dutyBlips: [],
    interactionDuty: [],
    storageLabel: [],
    storageMarkers: [],
    storageBlips: [],
    storageInteraction: [],
    vehShopLabel: [],
    vehShopMarkers: [],
    vehShopBlips: [],
    vehShopInteraction: [],
    bossMenuLabel: [],
    bossMenuMarkers: [],
    bossMenuBlips: [],
    bossMenuInteraction: [],
    shopLabel: [],
    shopMarkers: [],
    shopBlips: [],
    shopInteraction: [],
    clothingLabel: [],
    clothingMarkers: [],
    clothingBlips: [],
    clothingInteraction: [],
    jobBlips: [],
};

let oldMembers: { _id: string; faction: string }[] = [];
const factionBlips = new Map<string, Map<alt.Player, any>>(); // Map of factions to on-duty players and their blips
const lastPositions = new WeakMap<alt.Player, alt.Vector3>();
const playerMarkers = new Map<alt.Player, any[]>();

async function syncJob(player: alt.Player, factionId: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
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
            await destroyMarkers('dutyMarkers');
            if (dutyLocations) {
                await createMarkers(player, 'dutyMarkers', dutyLocations, 'Duty', 'BLUE', 351, handleDutyInteraction);
            }

            await destroyMarkers('storageMarkers');
            await destroyMarkers('vehShopMarkers');
            await destroyMarkers('bossMenuMarkers');
            await destroyMarkers('shopMarkers');
            await destroyMarkers('clothingMarkers');

            if (duty) {
                await addPlayerToFactionBlips(player, factionId);
                if (storageLocation) {
                    await createMarkers(
                        player,
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
                        'vehShopMarkers',
                        vehicleShopLocation,
                        'Vehicle Shop',
                        'BLUE',
                        351,
                        handleVehicleShopInteraction,
                    );
                }
                if (bossMenuLoccation) {
                    await createMarkers(player, 'bossMenuMarkers', bossMenuLoccation, 'Boss Menu', 'BLUE', 351);
                }
                if (factionShopLocation) {
                    await createMarkers(player, 'shopMarkers', factionShopLocation, 'Shop', 'BLUE', 351);
                }
                if (clothingLocation) {
                    await createMarkers(player, 'clothingMarkers', clothingLocation, 'Clothing', 'BLUE', 351);
                }
            } else {
                await removePlayerFromFactionBlips(player, factionId);
            }
        } else {
            await destroyAllMarkers();
        }
    } catch (error) {
        console.error('Error in syncJob:', error);
    }
}
alt.setInterval(() => {
    if (!factionBlips.size) return; // Skip if no factions have on-duty players
    factionBlips.forEach((blipMap, faction) => {
        blipMap.forEach((blip, player) => {
            try {
                if (!player || !player.valid) {
                    // Player disconnected or invalid
                    blip.destroy();
                    blipMap.delete(player);
                    return;
                }
                const lastPos = lastPositions.get(player);

                if (!lastPos) {
                    lastPositions.set(player, player.pos);
                    return; // Skip this cycle
                }
                const dist = Utility.vector.distance(lastPos, player.pos);
                if (dist > 5) {
                    blip.update({ pos: player.pos });
                    lastPositions.set(player, player.pos); // Update last position
                }
            } catch (error) {
                console.error(
                    `Error updating blip for player ${player?.name || player?.id || 'unknown'} in faction ${faction}:`,
                    error,
                );
            }
        });
        if (!blipMap.size) {
            factionBlips.delete(faction);
        }
    });
}, 1000); // Adjust interval duration as needed

async function addPlayerToFactionBlips(player: alt.Player, faction: string) {
    if (!factionBlips.has(faction)) {
        factionBlips.set(faction, new Map());
    }

    const blipMap = factionBlips.get(faction);
    if (!blipMap.has(player)) {
        const blip = Rebar.controllers.useBlipGlobal({
            pos: player.pos,
            color: BlipColor.BLUE,
            sprite: 1, // Example blip type
            shortRange: false, // Visible to all
            text: `${player.name} (On Duty)`,
        });
        blipMap.set(player, blip);
    }
}

async function removePlayerFromFactionBlips(player: alt.Player, faction: string) {
    const blipMap = factionBlips.get(faction);
    if (blipMap?.has(player)) {
        const blip = blipMap.get(player);
        blip.destroy(); // Destroy the blip
        blipMap.delete(player);
    }

    if (blipMap?.size === 0) {
        factionBlips.delete(faction); // Cleanup faction if no players are left
    }
}
async function createMarkers(
    player: alt.Player,
    markerType: keyof typeof markers,
    locations: any[],
    text: string,
    color: keyof typeof BlipColor,
    sprite: number,
    interactionHandler?: (player: alt.Player, colshape: alt.Colshape, uid: string) => Promise<void>,
) {
    locations.forEach((location) => {
        const position = location.pos;
        const playerMarkerList = playerMarkers.get(player) || [];
        // markers[markerType].push(
        //     Rebar.controllers.useTextLabelGlobal(
        //         { text: "Press 'E' to Interact", pos: new alt.Vector3(position).add(0, 0, 1) },
        //         10,
        //     ),
        // );
        const marker = Rebar.controllers.useMarkerGlobal(
            {
                pos: new alt.Vector3(position.x, position.y, position.z + 1),
                color: new alt.RGBA(0, 50, 200, 255),
                scale: new alt.Vector3(1, 1, 1),
                type: MarkerType.CHEVRON_UP_SINGLE,
            },
            10,
        );
        playerMarkerList.push(marker);

        const blip = Rebar.controllers.useBlipGlobal({
            pos: new alt.Vector3(position),
            color,
            sprite,
            shortRange: true,
            text,
        });
        playerMarkerList.push(blip);

        const interaction = Rebar.controllers.useInteraction(
            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
            'player',
        );

        if (interactionHandler) {
            interaction.on(interactionHandler);
        }
        interaction.onEnter((player) => {
            NotificationAPI.textLabel.create(player, { keyToPress: 'E', label: text });
        });
        interaction.onLeave((player) => {
            NotificationAPI.textLabel.remove(player);
        });
        markers[markerType].push(interaction);
    });
}

async function destroyMarkers(markerType: keyof typeof markers) {
    try {
        markers[markerType].forEach((item) => item.destroy());
        markers[markerType].length = 0;
    } catch (error) {
        console.error(`Error in destroyMarkers(${markerType}):`, error);
    }
}

async function destroyAllMarkers() {
    try {
        await Promise.all(Object.keys(markers).map((type) => destroyMarkers(type as keyof typeof markers)));
    } catch (error) {
        console.error('Error in destroyAllMarkers:', error);
    }
}

export async function updateFactionMembers(factionId: string) {
    try {
        const factionData = await factionUpdate.findFactionById(factionId);
        if (!factionData || factionData.members === undefined || !factionId) {
            destroyAllMarkers();
            return;
        }

        const memberIdentifiers = Object.keys(factionData.members);
        if (!memberIdentifiers) return;

        for (let i = oldMembers.length - 1; i >= 0; i--) {
            const oldMember = oldMembers[i];
            const xPlayer = getter.byCharacter(parseInt(oldMember._id));
            const character = Rebar.document.character.useCharacter(xPlayer);
            const document = character.get();
            if (!memberIdentifiers.includes(document.id.toString()) || !xPlayer || !xPlayer.valid) {
                if (xPlayer) {
                    await destroyAllMarkers(); // Destroy any active markers
                }
                oldMembers.splice(i, 1); // Remove from oldMembers
            }
        }
        for (const memberId of memberIdentifiers) {
            const xPlayer = getter.byCharacter(parseInt(memberId));
            const oldMemberIndex = oldMembers.findIndex((f) => f._id === memberId);
            if (oldMemberIndex === -1) {
                if (xPlayer && Rebar.document.character.useCharacter(xPlayer).isValid()) {
                    const character = Rebar.document.character.useCharacter(xPlayer);
                    const document = character.get();
                    if (document.id.toString() === memberId) {
                        oldMembers.push({ _id: memberId, faction: factionId });
                        await syncJob(xPlayer, factionId);
                    }
                }
            } else {
                await syncJob(xPlayer, factionId);
            }
        }
    } catch (error) {
        console.error('Error in updateFactionMembers:', error);
    }
}

factionUpdate.onUpdate(updateFactionMembers);

export async function updateJobBlips(player: alt.Player) {
    const jobLocations: { joblocation: JobLocal[]; factionName: string }[] = [];

    const allFactions = factionUpdate.getAllFactions();
    for (const data of allFactions) {
        const location = await useFactionFunctions().getLocationsByType(data._id as string, 'jobLocations');
        if (location) {
            jobLocations.push({
                joblocation: location,
                factionName: data.factionName,
            });
        }
    }
    if (!jobLocations) return;
    for (const jobLocation of jobLocations) {
        for (const location of jobLocation.joblocation) {
            markers.jobBlips.push(
                Rebar.controllers.useBlipGlobal({
                    pos: new alt.Vector3(location.pos),
                    color: location.color || 'BLUE',
                    sprite: location.sprite || 351,
                    shortRange: true,
                    text: `${jobLocation.factionName}`,
                }),
            );
        }
    }
}

function registerMessengerCommand() {
    messenger.commands.register({
        name: '/rfm',
        desc: '/remove faction member',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, charid: string) => {
            await faction.kickMember(factionId, parseInt(charid));
        },
    });
}

registerMessengerCommand();
