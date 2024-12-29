import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import { Character } from '@Shared/types/character.js';
import { BlipColor } from '@Shared/types/blip.js';
import { findFactionById, update } from './faction.controller.js';
import { useBlipGlobal } from './blip.controller.js';
import { onMemberAdd, onMemberKick } from './member.controller.js';
import { registerFactionLocationCallback } from './locationManager.js';

const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const getter = Rebar.get.usePlayerGetter();

const factionBlips = new Map<string, Map<alt.Player, any>>(); // Map of factions to on-duty players and their blips

export interface DutyChangeEvent {
    player: alt.Player;
    characterId: number;
    factionId: string;
    isOnDuty: boolean;
}

type DutyChangeCallback = (event: DutyChangeEvent) => void;
const dutyChangeHandlers = new Set<DutyChangeCallback>();
const offDutyChangeHandlers = new Set<DutyChangeCallback>(); // New set for off-duty handlers

export function onDutyChange(callback: DutyChangeCallback): void {
    dutyChangeHandlers.add(callback);
}

export function offDutyChange(callback: DutyChangeCallback): void {
    offDutyChangeHandlers.add(callback);
}

function triggerDutyChange(event: DutyChangeEvent): void {
    // Always trigger onDutyChange handlers
    dutyChangeHandlers.forEach((handler) => {
        handler(event);
    });

    // If player is going off duty, also trigger offDutyChange handlers
    if (!event.isOnDuty) {
        offDutyChangeHandlers.forEach((handler) => {
            handler(event);
        });
    }
}

export async function getDuty(factionId: string, characterId: number): Promise<boolean> {
    const faction = findFactionById(factionId);
    if (faction.members[characterId] === undefined || !faction.members[characterId]) return false;
    return faction.members[characterId].duty;
}

export async function setDuty(factionId: string, characterId: number, value?: boolean): Promise<boolean> {
    const faction = findFactionById(factionId);
    if (!faction.members[characterId]) {
        return false;
    }

    const result = await db.getMany<Character>({ id: characterId }, 'Characters');
    const character = result[0];

    if (!character) return false;

    const player = getter.byCharacter(characterId);
    if (!player) return false;

    // Set the duty status
    const newDutyStatus = value !== undefined ? value : !faction.members[characterId].duty;
    faction.members[characterId].duty = newDutyStatus;

    const didUpdate = await update(faction._id as string, 'members', {
        members: faction.members,
    });

    // Trigger duty change event
    triggerDutyChange({
        player,
        characterId,
        factionId,
        isOnDuty: newDutyStatus,
    });

    return didUpdate.status;
}
export async function addPlayerToFactionBlips(player: alt.Player, characterId: number, factionId: string) {
    if (!player?.valid) {
        // console.error('Invalid player object in addPlayerToFactionBlips.');
        return;
    }

    // Ensure the faction map exists
    if (!factionBlips.has(factionId)) {
        factionBlips.set(factionId, new Map());
    }

    const blipMap = factionBlips.get(factionId);

    // Check the player's duty status
    const dutyStatus = await getDuty(factionId, characterId);

    if (!dutyStatus) {
        await removePlayerFromFactionBlips(player, characterId, factionId);
        return;
    }

    // Check if the player is already in the faction blip map
    if (blipMap.has(player)) {
        // console.log(`Player ${player.name} is already on duty for faction ${factionId}.`);
        return;
    }

    // Create a new unique blip for this player
    const selfBlip = useBlipGlobal({
        pos: player.pos,
        color: BlipColor.GREEN,
        scale: 1,
        sprite: 1,
        shortRange: false,
        text: `${player.name} (On Duty)`,
    });
    selfBlip.attach(player);

    // Add this blip to the faction map
    const newPlayerBlips = new Map();
    newPlayerBlips.set(player, selfBlip);
    blipMap.set(player, newPlayerBlips);

    // Attach this player's blip to all other on-duty players and vice versa
    blipMap.forEach((otherBlips, otherPlayer) => {
        if (!otherPlayer.valid) return;

        // Ensure the other player is on duty
        const otherCharacterId = Rebar.document.character.useCharacter(otherPlayer).get().id;
        const otherDutyStatus = getDuty(factionId, otherCharacterId);
        if (!otherDutyStatus) return;

        // Attach this player's blip to the other player
        const otherBlip = otherBlips.get(otherPlayer);
        if (!otherBlip) {
            // console.error(`Blip for ${otherPlayer.name} is undefined`);
            return;
        }
        if (otherBlip) {
            otherBlip.addTarget(player); // Add the current player as a target
            selfBlip.addTarget(otherPlayer); // Add the other player as a target
        }
    });

    // console.log(`Blip for ${player.name} added and attached to other on-duty players.`);
}

export async function removePlayerFromFactionBlips(player: alt.Player, characterId: number, factionId: string) {
    if (!player?.valid) {
        // console.error('Invalid player object in removePlayerFromFactionBlips.');
        return;
    }

    const blipMap = factionBlips.get(factionId);
    if (!blipMap) return;

    // Retrieve the player's own blips
    const playerBlips = blipMap.get(player);

    // Detach this player's blip from all other players
    blipMap.forEach((otherBlips, otherPlayer) => {
        if (!otherPlayer.valid) return;

        // Remove this player from the other player's blips
        const otherBlip = otherBlips.get(otherPlayer);
        if (otherBlip) {
            otherBlip.removeTarget(player);
        }

        // Remove the other player from this player's blips
        if (playerBlips) {
            const playerBlip = playerBlips.get(otherPlayer);
            if (playerBlip) {
                playerBlip.removeTarget(otherPlayer);
            }
        }
    });

    // Destroy all blips associated with this player
    if (playerBlips) {
        playerBlips.forEach((blip) => blip.destroy());
    }

    // Remove the player from the faction map
    blipMap.delete(player);

    // If no players remain in the faction, remove the faction entry
    if (blipMap.size === 0) {
        factionBlips.delete(factionId);
    }

    // console.log(`Blip for ${player.name} removed and detached from all players.`);
}

function handleFactionBlips({ player, characterId, factionId, isOnDuty = true }: DutyChangeEvent) {
    if (isOnDuty) {
        addPlayerToFactionBlips(player, characterId, factionId);
    } else {
        removePlayerFromFactionBlips(player, characterId, factionId);
    }
}

function updateFaction(player: alt.Player, factionId: string) {
    const character = Rebar.document.character.useCharacter(player);
    const duty = getDuty(factionId, character.get().id);
    if (duty) {
        setDuty(factionId, character.get().id, false);
    }
}

// Register the blip handler
onDutyChange(handleFactionBlips);
onMemberAdd(handleFactionBlips);
onMemberKick(handleFactionBlips);

alt.on('rebar:playerCharacterBound', async (player: alt.Player, document: Character) => {
    if (document.faction) {
        updateFaction(player, document.faction);
    }
});

registerFactionLocationCallback('dutyLocations', async (player: alt.Player, factionId: string, locactionId: string) => {
    if (!player?.valid) return;
    const character = Rebar.document.character.useCharacter(player);
    if (!character?.get()?.faction) return;
    const duty = await getDuty(character?.get()?.faction, character.get().id);
    await setDuty(character?.get()?.faction, character?.get()?.id, !duty);
});
