import alt from 'alt-server';
import { useRebar } from '@Server/index.js';

const Rebar = useRebar();
const api = Rebar.useApi();
const { registerContext } = await api.getAsync('g-lib-api');
const faction = await api.getAsync('faction-functions-api');

export async function handleDutyInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    // registerContext(player, 'vehicle_showroom_menu', [
    //     {
    //         id: 'vehicle_showroom_menu',
    //         title: 'Vehicle Showroom',
    //         canClose: true,
    //         onExit: () => {
    //             console.log('Exiting showroom menu', 'info');
    //         },
    //         options: [
    //             {
    //                 title: 'Customize Vehicle',
    //                 description: 'Customize a vehicle before purchase.',
    //                 iconColor: '#70C6FF',
    //                 onSelect: () => {
    //                     console.log('Opening vehicle customization options', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Purchase Vehicle',
    //                 description: 'Purchase the selected vehicle.',
    //                 iconColor: '#28A745', // Green for purchase
    //                 onSelect: () => {
    //                     console.log('Initiating vehicle purchase process', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'View Vehicle Details',
    //                 description: 'Check details of a specific vehicle.',
    //                 menu: 'vehicle_details_menu', // Navigates to vehicle details
    //                 arrow: true,
    //                 iconColor: '#FFC107',
    //             },
    //         ],
    //     },
    //     {
    //         id: 'vehicle_details_menu',
    //         title: 'Vehicle Details',
    //         canClose: true,
    //         onExit: () => {
    //             console.log('Exited vehicle details menu', 'info');
    //         },
    //         onBack: () => {
    //             console.log('Going back to the showroom menu', 'info');
    //         },
    //         options: [
    //             {
    //                 title: 'Vehicle Specifications',
    //                 description: 'View detailed specifications of the vehicle.',
    //                 iconColor: '#17A2B8',
    //                 onSelect: () => {
    //                     console.log('Viewing vehicle specifications', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Vehicle Features',
    //                 description: 'View features like engine type, color, etc.',
    //                 iconColor: '#FFC107',
    //                 onSelect: () => {
    //                     console.log('Viewing vehicle features', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Test Drive',
    //                 description: 'Request a test drive for the selected vehicle.',
    //                 iconColor: '#28A745',
    //                 onSelect: () => {
    //                     console.log('Initiating test drive', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Vehicle Purchase',
    //                 description: 'Purchase the selected vehicle.',
    //                 menu: 'vehicle_purchase_menu',
    //                 arrow: true,
    //                 iconColor: '#6C757D',
    //             },
    //         ],
    //     },
    //     {
    //         id: 'vehicle_purchase_menu',
    //         title: 'Purchase Vehicle',
    //         canClose: true,
    //         onExit: () => {
    //             console.log('Exited vehicle purchase menu', 'info');
    //         },
    //         onBack: () => {
    //             console.log('Going back to the showroom menu', 'info');
    //         },
    //         options: [
    //             {
    //                 title: 'Select Vehicle',
    //                 description: 'Choose the vehicle you want to purchase.',
    //                 iconColor: '#FF5733',
    //                 onSelect: () => {
    //                     console.log('Vehicle selection initiated', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Payment Options',
    //                 description: 'Select a payment method for your purchase.',
    //                 iconColor: '#007BFF',
    //                 onSelect: () => {
    //                     console.log('Opening payment options', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Confirm Purchase',
    //                 description: 'Confirm and complete your vehicle purchase.',
    //                 iconColor: '#28A745',
    //                 onSelect: () => {
    //                     console.log('Confirming purchase', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Cancel Purchase',
    //                 description: 'Cancel the purchase and return to the showroom.',
    //                 iconColor: '#DC3545',
    //                 onSelect: () => {
    //                     console.log('Purchase canceled', 'info');
    //                 },
    //             },
    //             {
    //                 title: 'Back to Showroom',
    //                 description: 'Go back to the showroom menu.',
    //                 menu: 'vehicle_showroom_menu',
    //                 arrow: true,
    //                 iconColor: '#6C757D',
    //             },
    //         ],
    //     },
    // ]);

    try {
        const character = Rebar.document.character.useCharacter(player);
        const document = character.get();
        await faction.setDuty(document.faction, document.id);
    } catch (error) {
        console.error('Error in handleDutyInteraction:', error);
    }
}

export async function handleStorageInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    console.log('dsdas');
}
export async function handleVehicleShopInteraction(player: alt.Player, colshape: alt.Colshape, uid: string) {
    console.log('dsdssssssssssas');
}
