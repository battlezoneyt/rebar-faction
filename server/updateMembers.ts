import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import { MarkerType } from '../../../main/shared/types/marker.js';
import { BlipColor, Blip } from '@Shared/types/blip.js';
import { JobLocal } from '../shared/interface.js';
import { useFactionFunctions } from './functions.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const messenger = Rebar.messenger.useMessenger();
const faction = await api.getAsync('faction-functions-api');
const factionUpdate = await api.getAsync('faction-handlers-api');
const getter = Rebar.get.usePlayerGetter();

const jobBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];

const textDutyLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const dutyMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const dutyBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const interactionDuty: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

const storageLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const storageMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const storageBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const storageInteraction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

const vehShopLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const vehShopMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const vehShopBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const vehShopInteraction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

const bossMenuLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const bossMenuMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const bossMenuBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const bossMenuInteraction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

const shopLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const shopMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const shopBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const shopInteraction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

const clothingLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const clothingMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const clothingBlips: ReturnType<typeof Rebar.controllers.useBlipGlobal>[] = [];
const clothingInteraction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

let oldMembers: { _id: string; faction: string }[] = [];

async function syncJob(player: alt.Player, factionId: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        const duty = await faction.getDuty(factionId, document._id);
        const dutyLocations = (await faction.getLocationsByType(factionId, 'dutyLocations')) || [];
        const storageLocation = (await faction.getLocationsByType(factionId, 'storageLocations')) || [];
        const vehicleShopLocation = (await faction.getLocationsByType(factionId, 'vehicleShopLoc')) || [];
        const bossMenuLoccation = (await faction.getLocationsByType(factionId, 'bossMenuLoc')) || [];
        const factionShopLocation = (await faction.getLocationsByType(factionId, 'factionShopLoc')) || [];
        const clothingLocation = (await faction.getLocationsByType(factionId, 'clothingLoc')) || [];

        if (document.faction === factionId) {
            await destroyDutyMarkers();
            for (const location of dutyLocations) {
                const position = location.pos;
                textDutyLabel.push(
                    Rebar.controllers.useTextLabelGlobal(
                        { text: "Press 'E' to Interact", pos: new alt.Vector3(position).add(0, 0, 1) },
                        10,
                    ),
                );
                dutyMarkers.push(
                    Rebar.controllers.useMarkerGlobal(
                        {
                            pos: position,
                            color: new alt.RGBA(0, 50, 200, 255),
                            scale: new alt.Vector3(3, 3, 1),
                            type: MarkerType.CYLINDER,
                        },
                        10,
                    ),
                );
                interactionDuty.push(
                    Rebar.controllers.useInteraction(
                        new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                        'player',
                    ),
                );

                dutyBlips.push(
                    Rebar.controllers.useBlipGlobal({
                        pos: new alt.Vector3(position),
                        color: BlipColor.BLUE,
                        sprite: 351,
                        shortRange: true,
                        text: 'Duty',
                    }),
                );

                interactionDuty[interactionDuty.length - 1].on(handleDutyInteraction);
            }

            await destroyStorageMarkers();
            await destroyVehShopMarkers();
            await destroyBossMenuMarkers();
            await destroyShopMarkers();
            await destroyClothingMarkers();
            if (duty) {
                for (const location of storageLocation) {
                    const position = location.pos;
                    storageLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    storageMarkers.push(
                        Rebar.controllers.useMarkerGlobal(
                            {
                                pos: position,
                                color: new alt.RGBA(0, 50, 200, 255),
                                scale: new alt.Vector3(3, 3, 1),
                                type: MarkerType.CYLINDER,
                            },
                            10,
                        ),
                    );
                    storageBlips.push(
                        Rebar.controllers.useBlipGlobal({
                            pos: new alt.Vector3(position),
                            color: BlipColor.BLUE,
                            sprite: 351,
                            shortRange: true,
                            text: 'Storage',
                        }),
                    );

                    storageInteraction.push(
                        Rebar.controllers.useInteraction(
                            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                            'player',
                        ),
                    );
                }
                for (const location of vehicleShopLocation) {
                    const position = location.pos;
                    vehShopLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    storageMarkers.push(
                        Rebar.controllers.useMarkerGlobal(
                            {
                                pos: position,
                                color: new alt.RGBA(0, 50, 200, 255),
                                scale: new alt.Vector3(3, 3, 1),
                                type: MarkerType.CYLINDER,
                            },
                            10,
                        ),
                    );
                    vehShopBlips.push(
                        Rebar.controllers.useBlipGlobal({
                            pos: new alt.Vector3(position),
                            color: BlipColor.BLUE,
                            sprite: 351,
                            shortRange: true,
                            text: 'Storage',
                        }),
                    );

                    vehShopInteraction.push(
                        Rebar.controllers.useInteraction(
                            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                            'player',
                        ),
                    );
                }
                for (const location of bossMenuLoccation) {
                    const position = location.pos;
                    bossMenuLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    bossMenuMarkers.push(
                        Rebar.controllers.useMarkerGlobal(
                            {
                                pos: position,
                                color: new alt.RGBA(0, 50, 200, 255),
                                scale: new alt.Vector3(3, 3, 1),
                                type: MarkerType.CYLINDER,
                            },
                            10,
                        ),
                    );
                    bossMenuBlips.push(
                        Rebar.controllers.useBlipGlobal({
                            pos: new alt.Vector3(position),
                            color: BlipColor.BLUE,
                            sprite: 351,
                            shortRange: true,
                            text: 'Storage',
                        }),
                    );

                    bossMenuInteraction.push(
                        Rebar.controllers.useInteraction(
                            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                            'player',
                        ),
                    );
                }
                for (const location of factionShopLocation) {
                    const position = location.pos;
                    shopLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    shopMarkers.push(
                        Rebar.controllers.useMarkerGlobal(
                            {
                                pos: position,
                                color: new alt.RGBA(0, 50, 200, 255),
                                scale: new alt.Vector3(3, 3, 1),
                                type: MarkerType.CYLINDER,
                            },
                            10,
                        ),
                    );
                    shopBlips.push(
                        Rebar.controllers.useBlipGlobal({
                            pos: new alt.Vector3(position),
                            color: BlipColor.BLUE,
                            sprite: 351,
                            shortRange: true,
                            text: 'Storage',
                        }),
                    );

                    shopInteraction.push(
                        Rebar.controllers.useInteraction(
                            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                            'player',
                        ),
                    );
                }
                for (const location of clothingLocation) {
                    const position = location.pos;
                    clothingLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    clothingMarkers.push(
                        Rebar.controllers.useMarkerGlobal(
                            {
                                pos: position,
                                color: new alt.RGBA(0, 50, 200, 255),
                                scale: new alt.Vector3(3, 3, 1),
                                type: MarkerType.CYLINDER,
                            },
                            10,
                        ),
                    );
                    clothingBlips.push(
                        Rebar.controllers.useBlipGlobal({
                            pos: new alt.Vector3(position),
                            color: BlipColor.BLUE,
                            sprite: 351,
                            shortRange: true,
                            text: 'Storage',
                        }),
                    );

                    clothingInteraction.push(
                        Rebar.controllers.useInteraction(
                            new alt.ColshapeCylinder(position.x, position.y, position.z, 3, 3),
                            'player',
                        ),
                    );
                }
            }
        } else {
            await destroyMarkers();
        }
    } catch (error) {
        console.error('Error in syncJob:', error);
    }
}

async function destroyDutyMarkers() {
    try {
        textDutyLabel.forEach((label) => label.destroy());
        textDutyLabel.length = 0;

        interactionDuty.forEach((interact) => interact.destroy());
        interactionDuty.length = 0;

        dutyBlips.forEach((blip) => blip.destroy());
        dutyBlips.length = 0;

        dutyMarkers.forEach((marker) => marker.destroy());
        dutyMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyDutyMarkers:', error);
    }
}

async function destroyStorageMarkers() {
    try {
        storageLabel.forEach((label) => label.destroy());
        storageLabel.length = 0;

        storageBlips.forEach((blips) => blips.destroy());
        storageBlips.length = 0;

        storageInteraction.forEach((interact) => interact.destroy());
        storageInteraction.length = 0;

        storageMarkers.forEach((marker) => marker.destroy());
        storageMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}

async function destroyVehShopMarkers() {
    try {
        vehShopLabel.forEach((label) => label.destroy());
        vehShopLabel.length = 0;
        vehShopBlips.forEach((blips) => blips.destroy());
        vehShopBlips.length = 0;
        vehShopInteraction.forEach((interact) => interact.destroy());
        vehShopInteraction.length = 0;
        vehShopMarkers.forEach((marker) => marker.destroy());
        vehShopMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}

async function destroyBossMenuMarkers() {
    try {
        bossMenuLabel.forEach((label) => label.destroy());
        bossMenuLabel.length = 0;
        bossMenuBlips.forEach((blips) => blips.destroy());
        bossMenuBlips.length = 0;
        bossMenuInteraction.forEach((interact) => interact.destroy());
        bossMenuInteraction.length = 0;
        bossMenuMarkers.forEach((marker) => marker.destroy());
        bossMenuMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}

async function destroyShopMarkers() {
    try {
        shopLabel.forEach((label) => label.destroy());
        shopLabel.length = 0;
        shopBlips.forEach((blips) => blips.destroy());
        shopBlips.length = 0;
        shopInteraction.forEach((interact) => interact.destroy());
        shopInteraction.length = 0;
        shopMarkers.forEach((marker) => marker.destroy());
        shopMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}

async function destroyClothingMarkers() {
    try {
        clothingLabel.forEach((label) => label.destroy());
        clothingLabel.length = 0;
        clothingBlips.forEach((blips) => blips.destroy());
        clothingBlips.length = 0;
        clothingInteraction.forEach((interact) => interact.destroy());
        clothingInteraction.length = 0;
        clothingMarkers.forEach((marker) => marker.destroy());
        clothingMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}
async function destroyMarkers() {
    try {
        await destroyDutyMarkers();
        await destroyStorageMarkers();
    } catch (error) {
        console.error('Error in destroyMarkers:', error);
    }
}

async function handleDutyInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        await faction.setDuty(document.faction, document._id);
    } catch (error) {
        console.error('Error in handleDutyInteraction:', error);
    }
}

export async function updateFactionMembers(factionId: string) {
    try {
        const factionData = await factionUpdate.findFactionById(factionId);
        if (!factionData || factionData.members === undefined || factionId === null || factionId === undefined) {
            destroyMarkers();
            return;
        }

        const memberIdentifiers = Object.keys(factionData.members);
        if (!memberIdentifiers) return;

        for (const memberId of memberIdentifiers) {
            const xPlayer = getter.byCharacter(memberId);
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
                const player = getter.byCharacter(oldMembers[i]._id);
                if (player) {
                    await destroyMarkers();
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
        if (location != undefined) {
            jobLocations.push({
                joblocation: location,
                factionName: data.factionName,
            });
        }
    }

    for (const jobLocation of jobLocations) {
        for (const location of jobLocation.joblocation) {
            jobBlips.push(
                Rebar.controllers.useBlipGlobal({
                    pos: new alt.Vector3(location.pos),
                    color: location.color ? location.color : BlipColor.BLUE,
                    sprite: location.sprite ? location.sprite : 351,
                    shortRange: true,
                    text: `${jobLocation.factionName}`,
                }),
            );
        }
    }
}

function registerMessengerCommand() {
    messenger.commands.register({
        name: '/rm',
        desc: '/tpm',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, charid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            await apifunction.kickMember(factionId, charid);
        },
    });
}

registerMessengerCommand();
