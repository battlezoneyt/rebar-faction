import * as alt from 'alt-shared';

import { BlipColor } from '@Shared/types/blip.js';
import { MarkerType } from '@Shared/types/marker.js';

export const BLIP_SETTINGS = {
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
} as const;
