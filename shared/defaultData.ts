import { Grades } from './interface.js';

export const DefaultRanks: Array<Grades> = [
    {
        name: 'Owner',
        permissionLevel: 99,
        onDutyPay: 10000,
        offDutyPay: 1000,
        maxOnDutyPay: 11000,
        maxOffDutyPay: 1500,
    },
];
