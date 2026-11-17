/*
 * src/lib/roles.js
 *
 * Única fuente de verdad, en el frontend, para agrupar los nombres de rol que
 * vienen de la base (por ejemplo Docente / Profesor / Entrenador → "docente").
 * LoginForm, RoleDashboard y permisos.js usan estas funciones en lugar de tener
 * cada uno su propia lista.
 *
 * Si en la tabla `rol` existe un nombre que no aparece aquí, no tendrá pantalla
 * en el portal: añádelo a la lista de su grupo.
 */
import { normalizarNombre } from '$lib/modulos.js';

const nombresPorGrupo = Object.freeze({
	administrador: ['administrador', 'admin'],
	coordinador: ['coordinador'],
	secretaria: ['secretaria'],
	docente: ['docente', 'profesor', 'entrenador'],
	estudiante: ['estudiante'],
	acudiente: ['acudiente', 'padre', 'padre o acudiente'],
	director: ['director'],
	bienestar: ['bienestar', 'orientador', 'bienestar orientador']
});

/* normalizarNombre quita espacios y símbolos: "Padre o acudiente" → "padreoacudiente". */
const grupoPorNombre = new Map(
	Object.entries(nombresPorGrupo).flatMap(([grupo, nombres]) =>
		nombres.map((nombre) => [normalizarNombre(nombre), grupo])
	)
);

/** Devuelve el grupo canónico del rol ("docente", "acudiente"...) o null si no se reconoce. */
export function grupoRol(nombre) {
	return grupoPorNombre.get(normalizarNombre(nombre)) ?? null;
}

/** Texto para mostrar el nombre del rol tal como está en la base. */
export function etiquetaRol(nombre) {
	const texto = String(nombre ?? '').trim();
	return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}
