import { useRebar } from '@Server/index.js';
import alt from 'alt-server';

const Rebar = useRebar();
const faction = await Rebar.useApi().getAsync('faction-functions-api');

const textLabel: ReturnType<typeof Rebar.controllers.useTextLabelLocal>[] = [];
const interaction: ReturnType<typeof Rebar.controllers.useInteraction>[] = [];

export async function syncJob(player: alt.Player) {
    const rebarPlayer = Rebar.usePlayer(player);
    const duty = await faction.getDuty('6664a430ac28cf8f46b826e7', rebarPlayer.character.getField('_id'));
    const jobLocation = await faction.getLocationsByType('6664a430ac28cf8f46b826e7', 'storageLocations');

    if (duty) {
        for (const location of jobLocation) {
            const position = location.pos;
            textLabel.push(Rebar.controllers.useTextLabelGlobal({ text: "Press 'E' to Interact", pos: position }, 10));
            interaction.push(
                Rebar.controllers.useInteraction(
                    new alt.ColshapeCylinder(position.x, position.y, position.z, 10, 10),
                    'player',
                ),
            );
        }
    } else {
        textLabel.forEach((label) => label.destroy());
        interaction.forEach((interact) => interact.destroy());
    }
}

function int() {
    Rebar.events.useEvents().on('character-bound', syncJob);
}

int();
