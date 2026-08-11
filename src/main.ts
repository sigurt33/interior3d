import { defaultProject } from './core/model';
import { generateBedroom, BEDROOM_LIGHT_GROUPS } from './templates/bedroom';
import { mountViewer } from './ui/viewer';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Временная демо-инициализация; Task 14 заменит это мастером
const p = defaultProject('bedroom', 4000, 5000);
p.openings.push({ kind: 'door', wall: 0, offset: 100, width: 800, height: 2100 });
p.openings.push({ kind: 'window', wall: 2, offset: 1200, width: 1500, height: 1400, sill: 900 });
p.furniture = generateBedroom(p.room, p.openings);
p.lighting.groups = BEDROOM_LIGHT_GROUPS.map((id) => ({ id, on: true, brightness: 0.8 }));
mountViewer(app, p);
