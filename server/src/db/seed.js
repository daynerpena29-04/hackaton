import { initDatabase, seedFromDefault, db } from './database.js';

console.log('🌱 Inicializando y cargando datos oficiales de Campuslands...');
initDatabase();
seedFromDefault();

const spaces = db.prepare('SELECT count(*) as c FROM spaces').get().c;
const assets = db.prepare('SELECT count(*) as c FROM assets').get().c;
const reservations = db.prepare('SELECT count(*) as c FROM reservations').get().c;
const loans = db.prepare('SELECT count(*) as c FROM loans').get().c;
const incidents = db.prepare('SELECT count(*) as c FROM incidents').get().c;

console.log(`✅ Base de datos lista:
- Espacios registrados: ${spaces}
- Equipos en inventario: ${assets}
- Reservas activas: ${reservations}
- Préstamos registrados: ${loans}
- Incidencias operativas: ${incidents}
`);
process.exit(0);
