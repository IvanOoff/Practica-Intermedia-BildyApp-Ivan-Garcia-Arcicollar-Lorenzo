// EMISOR DE EVENTOS PARA EL CICLO DE VIDA DEL USUARIO
// EVENTOS: user.registered, user.validated, user.deleted, user.invited

import { EventEmitter } from 'node:events';

class UserEventEmitter extends EventEmitter {}

const userEvents = new UserEventEmitter();

userEvents.on('user.registered', (user) => {
  console.log(`EVENTO: Usuario registrado - ${user.email}`);
});

userEvents.on('user.validated', (user) => {
  console.log(`EVENTO: Usuario validado - ${user.email}`);
});

userEvents.on('user.deleted', (user) => {
  console.log(`EVENTO: Usuario eliminado - ${user.email}`);
});

userEvents.on('user.invited', (user, invitedEmail) => {
  console.log(`EVENTO: Usuario invitado - ${invitedEmail} a empresa`);
});

export default userEvents;
