import { normalizarNombre } from '$lib/modulos.js';
import { grupoRol } from '$lib/roles.js';

/**
 * Las acciones de escritura solo aparecen para módulos asignados al rol en el
 * perfil que devuelve /auth/me. El backend sigue siendo quien valida estos
 * permisos al recibir cada solicitud (main.py y security.py).
 *
 * Los roles se comparan por grupo (docente = docente/profesor/entrenador, etc.)
 * para que coincidan con el login y el dashboard.
 */
export function puedeRealizarAccion(rol, modulo, accion, perfil = leerPerfilActivo()) {
	if (!['crear', 'editar', 'eliminar'].includes(accion)) return false;

	const grupoActivo = grupoRol(perfil?.rol?.nombre);
	if (!grupoActivo) return false;
	if (rol && grupoRol(rol) !== grupoActivo) return false;

	const claveModulo = normalizarNombre(modulo);
	const puedeEscribirPorModulo = {
		actividades: ['administrador', 'coordinador'],
		inscripciones: ['administrador', 'coordinador'],
		autorizaciones: ['administrador', 'coordinador'],
		asistencia: ['administrador', 'coordinador', 'docente'],
		categorias: ['administrador', 'coordinador'],
		usuarios: ['administrador', 'secretaria'],
		estudiantes: ['administrador', 'secretaria'],
		acudientes: ['administrador', 'secretaria'],
		roles: ['administrador']
	};
	const gruposPermitidos = puedeEscribirPorModulo[claveModulo] ?? [];
	if (!gruposPermitidos.includes(grupoActivo)) return false;
	if (accion === 'eliminar' && claveModulo === 'asistencia') {
		const gruposQueEliminan = ['administrador', 'coordinador'];
		if (!gruposQueEliminan.includes(grupoActivo)) return false;
	}

	return Array.isArray(perfil?.modulos) && perfil.modulos.some((item) =>
		normalizarNombre(item?.nombre) === claveModulo
	);
}

/**
 * Indica si el perfil activo tiene asignado (y activo) un módulo.
 * /auth/me solo devuelve módulos activos, así que un módulo apagado en la
 * base (por ejemplo Calendario) nunca aparece aquí.
 */
export function tieneModulo(modulo, perfil = leerPerfilActivo()) {
	const clave = normalizarNombre(modulo);
	return Array.isArray(perfil?.modulos) && perfil.modulos.some((item) =>
		normalizarNombre(item?.nombre) === clave
	);
}

export function leerPerfilActivo() {
	if (typeof window === 'undefined') return null;
	try {
		return JSON.parse(sessionStorage.getItem('perfilPortal') ?? 'null');
	} catch {
		return null;
	}
}

/* Se conserva tal cual porque otras páginas pueden importarla. */
export function leerRolActivo() {
	return normalizarNombre(leerPerfilActivo()?.rol?.nombre);
}

/** Grupo canónico del rol activo: "docente", "acudiente", "bienestar"... o '' si no se reconoce. */
export function leerGrupoRolActivo() {
	return grupoRol(leerPerfilActivo()?.rol?.nombre) ?? '';
}
