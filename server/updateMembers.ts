import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

import { MarkerType } from '../../../main/shared/types/marker.js';
import { Character } from '@Shared/types/character.js';
import { Factions } from '../shared/interface.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const messenger = Rebar.messenger.useMessenger();
const faction = await api.getAsync('faction-functions-api');
const factionUpdate = await api.getAsync('faction-handlers-api');
const getter = Rebar.get.usePlayerGetter();

const textJobLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const interactionJob: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];
const textDutyLabel: ReturnType<typeof Rebar.controllers.useTextLabelGlobal>[] = [];
const interactionDuty: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];
const dutyMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
const jobMarkers: ReturnType<typeof Rebar.controllers.useMarkerGlobal>[] = [];
let oldMembers: { _id: string; faction: string }[] = [];

async function syncJob(player: alt.Player, factionId: string) {
    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        const duty = await faction.getDuty(factionId, document._id);
        const jobLocations = (await faction.getLocationsByType(factionId, 'jobLocations')) || [];
        const dutyLocations = (await faction.getLocationsByType(factionId, 'dutylocations')) || [];

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
                interactionDuty[interactionDuty.length - 1].on(handleDutyInteraction);
            }

            await destroyJobMarkers();
            if (duty) {
                for (const location of jobLocations) {
                    const position = location.pos;
                    textJobLabel.push(
                        Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10),
                    );
                    jobMarkers.push(
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
                    interactionJob.push(
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

        dutyMarkers.forEach((marker) => marker.destroy());
        dutyMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyDutyMarkers:', error);
    }
}

async function destroyJobMarkers() {
    try {
        textJobLabel.forEach((label) => label.destroy());
        textJobLabel.length = 0;

        interactionJob.forEach((interact) => interact.destroy());
        interactionJob.length = 0;

        jobMarkers.forEach((marker) => marker.destroy());
        jobMarkers.length = 0;
    } catch (error) {
        console.error('Error in destroyJobMarkers:', error);
    }
}

async function destroyMarkers() {
    try {
        await destroyDutyMarkers();
        await destroyJobMarkers();
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
