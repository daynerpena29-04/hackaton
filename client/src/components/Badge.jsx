import React from 'react';

export default function Badge({ type, label }) {
  let badgeClass = 'badge-indigo';

  const lower = (type || label || '').toLowerCase();

  if (['disponible', 'confirmada', 'activo', 'resuelta', 'optimo', 'baja'].includes(lower)) {
    badgeClass = 'badge-emerald';
  } else if (['en_mantenimiento', 'en_proceso', 'media', 'pendiente'].includes(lower)) {
    badgeClass = 'badge-amber';
  } else if (['inhabilitado', 'danado', 'cancelada', 'critica', 'alta', 'fallido'].includes(lower)) {
    badgeClass = 'badge-rose';
  } else if (['prestado', 'analizado', 'aplicado'].includes(lower)) {
    badgeClass = 'badge-purple';
  } else if (['devuelto', 'cerrada', 'aula', 'laptop'].includes(lower)) {
    badgeClass = 'badge-cyan';
  }

  return <span className={`badge ${badgeClass}`}>{label || type}</span>;
}
