<script>
	import { onMount } from 'svelte';
	import ApiOverview from '$lib/components/ApiOverview.svelte';
	import PageHeading from '$lib/components/PageHeading.svelte';
	import { leerGrupoRolActivo } from '$lib/permisos.js';

	/* Las claves son los grupos de src/lib/roles.js: un solo conjunto por grupo. */
	const resumenGestion = [
		{ endpoint: '/actividades/', label: 'Actividades' },
		{ endpoint: '/inscripciones/resumen', label: 'Inscripciones activas', countField: 'inscritos' },
		{ endpoint: '/asistencias/resumen', label: 'Registros de asistencia', countField: 'cantidad' },
		{ endpoint: '/autorizaciones/resumen', label: 'Autorizaciones', countField: 'cantidad' }
	];

	const conjuntosPorRol = {
		administrador: resumenGestion,
		coordinador: resumenGestion,
		docente: [
			{ endpoint: '/actividades/', label: 'Mis actividades' },
			{ endpoint: '/inscripciones/', label: 'Estudiantes inscritos' },
			{ endpoint: '/asistencias/', label: 'Registros de asistencia' }
		],
		estudiante: [
			{ endpoint: '/actividades/', label: 'Actividades disponibles' },
			{ endpoint: '/inscripciones/', label: 'Mis inscripciones' },
			{ endpoint: '/asistencias/', label: 'Mi asistencia' }
		],
		acudiente: [
			{ endpoint: '/actividades/', label: 'Actividades disponibles' },
			{ endpoint: '/estudiantes/', label: 'Estudiantes vinculados' },
			{ endpoint: '/inscripciones/', label: 'Inscripciones vinculadas' },
			{ endpoint: '/autorizaciones/', label: 'Autorizaciones vinculadas' },
			{ endpoint: '/asistencias/', label: 'Asistencia de mis acudidos' }
		],
		director: [
			{ endpoint: '/inscripciones/resumen-institucional', label: 'Inscripciones', countField: 'inscritos' },
			{ endpoint: '/asistencias/resumen', label: 'Registros de asistencia', countField: 'cantidad' },
			{ endpoint: '/autorizaciones/resumen', label: 'Autorizaciones', countField: 'cantidad' }
		],
		bienestar: [
			{ endpoint: '/estudiantes/resumen', label: 'Estudiantes', countField: 'cantidad' },
			{ endpoint: '/inscripciones/resumen', label: 'Participaciones', countField: 'inscritos' },
			{ endpoint: '/asistencias/resumen', label: 'Registros de asistencia', countField: 'cantidad' }
		],
		secretaria: [
			{ endpoint: '/estudiantes/resumen', label: 'Estudiantes', countField: 'cantidad' },
			{ endpoint: '/acudientes/resumen', label: 'Acudientes', countField: 'cantidad' },
			{ endpoint: '/usuarios/resumen', label: 'Cuentas gestionadas', countField: 'cantidad' }
		]
	};

	const nombresPorRol = {
		administrador: 'Administración escolar',
		coordinador: 'Coordinación escolar',
		docente: 'Espacio docente',
		estudiante: 'Mi espacio escolar',
		acudiente: 'Espacio familiar',
		director: 'Resumen de dirección',
		bienestar: 'Seguimiento de bienestar',
		secretaria: 'Gestión de matrículas y contactos'
	};

	let rol = $state('');
	let datasets = $derived(conjuntosPorRol[rol] ?? []);

	function actualizarPerfil() {
		rol = leerGrupoRolActivo();
	}

	onMount(() => {
		actualizarPerfil();
		window.addEventListener('perfil-portal-cambiado', actualizarPerfil);
		return () => window.removeEventListener('perfil-portal-cambiado', actualizarPerfil);
	});
</script>

{#if datasets.length}
	<!-- ApiOverview ya trae su <main>, título y botón Actualizar: no se duplica la cabecera. -->
	<ApiOverview title={nombresPorRol[rol] ?? 'Inicio'} eyebrow="Portal escolar" icon="bi-grid-1x2" {datasets} accesos />
{:else}
	<main class="container py-4">
		<PageHeading title={nombresPorRol[rol] ?? 'Inicio'} eyebrow="Portal escolar" icon="bi-grid-1x2" />
	</main>
{/if}
