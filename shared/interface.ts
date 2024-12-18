import * as alt from 'alt-shared';

declare module '@Shared/types/character.js' {
    export interface Character {
        faction?: string;
    }
}
export interface UserFaction {
    id: number;
    name: string;
    duty: boolean;
    gradeId: string;
    isOwner: boolean;
}

export interface FactionCore {
    _id: string;
    factionName: string;
    label: string;
    bank: number;
    socityPay: boolean;
    defaultDuty: boolean;
    offDutypay: boolean;
}

export interface Factions extends FactionCore {
    members: { [key: string]: UserFaction };
    grades: Array<Grades>;
    locations: Locations;
    vehicles: Array<Vehicle>;
}

export interface Grades {
    gradeId?: string;
    name: string;
    permissionLevel: number;
    onDutyPay: number;
    offDutyPay: number;
    maxOnDutyPay: number;
    maxOffDutyPay: number;
}

export interface Vehicle {
    vehicleId: string;
    model: string | number;
    price: number;
    gradeId: string;
}

export interface Locations {
    jobLocations?: Array<JobLocal>;
    storageLocations?: Array<JobLocal>;
    dutyLocations?: Array<JobLocal>;
    vehicleShopLoc?: Array<JobLocal>;
    bossMenuLoc?: Array<JobLocal>;
    factionShopLoc?: Array<JobLocal>;
    clothingLoc?: Array<JobLocal>;
}

export interface JobLocal {
    locationId: string;
    locationName: string;
    pos: alt.Vector3;
    gradeId: string;
    sprite?: number;
    color?: number;
    parkingSpots?: Array<{ pos: alt.Vector3; rot: alt.Vector3 }>;
}
