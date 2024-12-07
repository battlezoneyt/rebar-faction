import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import { MarkerType } from '../../../main/shared/types/marker.js';
import { BlipColor } from '@Shared/types/blip.js';
import { JobLocal } from '../shared/interface.js';
import { useFactionFunctions } from './functions.js';

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
                await createMarkers('dutyMarkers', dutyLocations, 'Duty', 'BLUE', 351, handleDutyInteraction);
            }

            await destroyMarkers('storageMarkers');
            await destroyMarkers('vehShopMarkers');
            await destroyMarkers('bossMenuMarkers');
            await destroyMarkers('shopMarkers');
            await destroyMarkers('clothingMarkers');

            if (duty) {
                if (storageLocation) {
                    await createMarkers(
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
                        'vehShopMarkers',
                        vehicleShopLocation,
                        'Vehicle Shop',
                        'BLUE',
                        351,
                        handleVehicleShopInteraction,
                    );
                }
                if (bossMenuLoccation) {
                    await createMarkers('bossMenuMarkers', bossMenuLoccation, 'Boss Menu', 'BLUE', 351);
                }
                if (factionShopLocation) {
                    await createMarkers('shopMarkers', factionShopLocation, 'Shop', 'BLUE', 351);
                }
                if (clothingLocation) {
                    await createMarkers('clothingMarkers', clothingLocation, 'Clothing', 'BLUE', 351);
                }
            }
        } else {
            await destroyAllMarkers();
        }
    } catch (error) {
        console.error('Error in syncJob:', error);
    }
}

async function createMarkers(
    markerType: keyof typeof markers,
    locations: any[],
    text: string,
    color: keyof typeof BlipColor,
    sprite: number,
    interactionHandler?: (player: alt.Player, colshape: alt.Colshape, uid: string) => Promise<void>,
) {
    locations.forEach((location) => {
        const position = location.pos;
        // markers[markerType].push(
        //     Rebar.controllers.useTextLabelGlobal(
        //         { text: "Press 'E' to Interact", pos: new alt.Vector3(position).add(0, 0, 1) },
        //         10,
        //     ),
        // );
        markers[markerType].push(
            Rebar.controllers.useMarkerGlobal(
                {
                    pos: new alt.Vector3(position.x, position.y, position.z + 1),
                    color: new alt.RGBA(0, 50, 200, 255),
                    scale: new alt.Vector3(1, 1, 1),
                    type: MarkerType.CHEVRON_UP_SINGLE,
                },
                10,
            ),
        );
        markers[markerType].push(
            Rebar.controllers.useBlipGlobal({
                pos: new alt.Vector3(position),
                color,
                sprite,
                shortRange: true,
                text,
            }),
        );

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

async function handleDutyInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        await faction.setDuty(document.faction, document.id);
    } catch (error) {
        console.error('Error in handleDutyInteraction:', error);
    }
}

async function handleStorageInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    console.log('dsdas');
}
async function handleVehicleShopInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    console.log('dsdssssssssssas');
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

        for (let i = oldMembers.length - 1; i >= 0; i--) {
            if (!memberIdentifiers.includes(oldMembers[i]._id)) {
                const player = getter.byCharacter(parseInt(oldMembers[i]._id));
                if (player) {
                    await destroyAllMarkers();
                }
                oldMembers.splice(i, 1);
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
