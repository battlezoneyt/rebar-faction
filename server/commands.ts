import { useRebar } from '@Server/index.js';
import alt from 'alt-server';
import * as Utility from '@Shared/utility/index.js';
import { useCharacter } from '@Server/document/index.js';
import { Factions, Locations } from '@Plugins/rebar-faction/shared/interface.js';

const rebar = useRebar();
const messenger = rebar.messenger.useMessenger();
const api = rebar.useApi();
const getter = rebar.get.usePlayerGetter();

async function registermyCommands() {
    messenger.commands.register({
        name: '/fcreate',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, characterId: string, factionName: string, Label: string) => {
            try {
                const api = await rebar.useApi().getAsync('faction-handlers-api');
                const result = await api.create(characterId, {
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
        name: '/fdelete',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string) => {
            try {
                const api = await rebar.useApi().getAsync('faction-handlers-api');
                const result = await api.remove(factionId);
                console.log(result.response);
            } catch (err) {
                messenger.message.send(player, { type: 'warning', content: 'Somthing went wrong!.' });
            }
        },
    });
    messenger.commands.register({
        name: '/add',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, charid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.addMember(factionId, charid);
        },
    });

    messenger.commands.register({
        name: '/gaf',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, rankid: string, name: string) => {
            const apifunction = await api.getAsync('faction-handlers-api');
            const result = await apifunction.getAllFactions();
            console.log(JSON.stringify(result));
        },
    });

    messenger.commands.register({
        name: '/cname',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, name: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.updateRankName(factionId, rankid, name);
        },
    });
    messenger.commands.register({
        name: '/sowner',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, cid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.setOwner(factionId, cid);
        },
    });
    messenger.commands.register({
        name: '/fowner',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, cid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.getFactionOwner(factionId);
        },
    });
    messenger.commands.register({
        name: '/fmrank',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, cid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.getFactionMemberRank(factionId, cid);
            console.log(result);
        },
    });
    messenger.commands.register({
        name: '/crank',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
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
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.addRank(
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
        name: '/urw',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, Weight: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.updateRankWeight(factionId, rankid, parseInt(Weight));
            console.log(result);
        },
    });
    messenger.commands.register({
        name: '/sr',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, rankid: string, swaprankid: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.swapRanks(factionId, rankid, swaprankid);
            console.log(result);
        },
    });

    messenger.commands.register({
        name: '/rfl',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, locationType: keyof Locations, locationId: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.removeLocations(player, factionId, locationType, locationId);
            console.log(result);
        },
    });

    messenger.commands.register({
        name: '/gfl',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string, locationType: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.getLocationsByType(factionId, locationType);
            console.log(result);
        },
    });
    messenger.commands.register({
        name: '/gduty',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (player: alt.Player, factionId: string) => {
            const apifunction = await api.getAsync('faction-functions-api');
            const rebarPlayer = rebar.usePlayer(player);
            const result = await apifunction.getDuty(factionId, rebarPlayer.character.getField('_id'));
            console.log(result);
        },
    });
    messenger.commands.register({
        name: '/afl',
        desc: '/tpm ',
        options: { accountPermissions: ['admin'] },
        callback: async (
            player: alt.Player,
            factionId: string,
            locationType: keyof Locations,
            locationName: string,
            x: string,
            y: string,
            z: string,
            gradeId: string,
        ) => {
            const pos = new alt.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
            const apifunction = await api.getAsync('faction-functions-api');
            const result = await apifunction.addLocations(player, factionId, locationType, locationName, pos, gradeId);
            console.log(result);
        },
    });
}

registermyCommands();
