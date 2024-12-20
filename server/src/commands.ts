import { useRebar } from '@Server/index.js';
import alt from 'alt-server';
import { Locations } from '@Plugins/rebar-faction/shared/interface.js';
import {
    addLocations,
    addMember,
    addRank,
    getDuty,
    getFactionMemberRank,
    getFactionOwner,
    getLocationsByType,
    kickMember,
    removeLocations,
    setOwner,
    swapRanks,
    updateRankName,
    updateRankWeight,
} from './functions.js';
import { create, getAllFactions, remove } from './handlers.js';

const rebar = useRebar();
const messenger = rebar.messenger.useMessenger();

async function registermyCommands() {
    messenger.commands.register({
        name: 'fcreate',
        desc: '/fcreate to create a faction',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, characterId: string, factionName: string, Label: string) => {
            try {
                const result = await create(parseInt(characterId), {
                    factionName: factionName,
                    label: Label,
                    bank: 10000,
                    socityPay: false,
                    defaultDuty: true,
                    offDutypay: false,
                });
                console.log(result.response);
            } catch (err) {
                messenger.message.send(player, { type: 'warning', content: 'Somthing went wrong!.' });
            }
        },
    });
    messenger.commands.register({
        name: 'fdelete',
        desc: '/fdelete to delete a faction from the system',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string) => {
            try {
                const result = await remove(factionId);
                console.log(result.response);
            } catch (err) {
                messenger.message.send(player, { type: 'warning', content: 'Somthing went wrong!.' });
            }
        },
    });
    messenger.commands.register({
        name: 'fadd',
        desc: '/fadd add new member to faction',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, charid: string) => {
            const result: string = await addMember(factionId, parseInt(charid));
            messenger.message.send(player, { type: 'alert', content: result });
        },
    });

    messenger.commands.register({
        name: 'fgetallf',
        desc: '/fgetallf to get all faction in the server',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player) => {
            const result = getAllFactions();
            console.log(JSON.stringify(result));
        },
    });

    messenger.commands.register({
        name: 'fchangerankname',
        desc: '/fchangerankname change the faction rank name ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, name: string) => {
            const result = await updateRankName(factionId, rankid, name);
        },
    });
    messenger.commands.register({
        name: 'fsetowner',
        desc: '/fsetowner to set faction owner ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, cid: string) => {
            const result = await setOwner(factionId, parseInt(cid));
        },
    });
    messenger.commands.register({
        name: 'ffindowner',
        desc: '/ffindowner to find daction owner ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string) => {
            const result = await getFactionOwner(factionId);
        },
    });
    messenger.commands.register({
        name: 'fgetmemberrank',
        desc: '/fgetmemberrank to get faction member rank ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, cid: string) => {
            const result = await getFactionMemberRank(factionId, parseInt(cid));
            console.log(result);
        },
    });
    messenger.commands.register({
        name: 'faddnewrank',
        desc: '/faddnewrank to add a new rank',
        options: { permissions: ['admin'] },
        callback: async (
            player: alt.Player,
            rankId: string,
            newName: string,
            Weight: string,
            onDutyPay: string,
            offDutyPay: string,
            maxOnDutyPay: string,
            MaxOffDutyPay: string,
        ) => {
            const result = await addRank(
                rankId,
                newName,
                parseInt(Weight),
                parseInt(onDutyPay),
                parseInt(offDutyPay),
                parseInt(maxOnDutyPay),
                parseInt(MaxOffDutyPay),
            );
            console.log(result);
        },
    });

    messenger.commands.register({
        name: 'fupdaterankweight',
        desc: '/fupdaterankweight to update Rank weight ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, Weight: string) => {
            const result = await updateRankWeight(factionId, rankid, parseInt(Weight));
            console.log(result);
        },
    });
    messenger.commands.register({
        name: 'fswaprank',
        desc: '/fswaprank swap between ranks ',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, swaprankid: string) => {
            const result = await swapRanks(factionId, rankid, swaprankid);
            console.log(result);
        },
    });

    messenger.commands.register({
        name: 'fremovelocation',
        desc: '/fremovelocation remove a faction location based on location Type',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, locationType: keyof Locations, locationId: string) => {
            const result = await removeLocations(player, factionId, locationType, locationId);
            console.log(result);
        },
    });

    messenger.commands.register({
        name: 'fgetlocation',
        desc: '/fgetlocation get faction location based on location Type',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, locationType: string) => {
            const result = await getLocationsByType(factionId, locationType);
            console.log(result);
        },
    });
    messenger.commands.register({
        name: 'fgetduty',
        desc: '/fgetduty get player duty status',
        callback: async (player: alt.Player, factionId: string) => {
            const character = rebar.document.character.useCharacter(player);
            const document = character.get();
            if (!document.faction) {
                return messenger.message.send(player, { type: 'warning', content: 'You are not in a faction!' });
            }
            const result = await getDuty(document.faction, document.id);
            if (result) {
                messenger.message.send(player, { type: 'alert', content: 'You are on duty!' });
            } else {
                messenger.message.send(player, { type: 'alert', content: 'You are not on duty!' });
            }
        },
    });
    messenger.commands.register({
        name: 'faddlocation',
        desc: '/faddlocation add new location for faction ',
        options: { permissions: ['admin'] },
        callback: async (
            player: alt.Player,
            factionId: string,
            locationType: keyof Locations,
            locationName: string,
            x: string,
            y: string,
            z: string,
            gradeId: string,
            sprite?: string,
            color?: string,
        ) => {
            const pos = new alt.Vector3(parseFloat(x), parseFloat(y), parseFloat(z) - 1);
            const result = await addLocations(
                player,
                factionId,
                locationType,
                locationName,
                pos,
                gradeId,
                parseInt(sprite),
                parseInt(color),
            );
            console.log(result);
        },
    });

    messenger.commands.register({
        name: '/fkick',
        desc: '/fkick to remove faction member',
        options: { permissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, charid: string) => {
            await kickMember(factionId, parseInt(charid));
        },
    });
}

registermyCommands();
