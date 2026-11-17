<script>
	import ApiOverview from '$lib/components/ApiOverview.svelte';
	import { leerGrupoRolActivo } from '$lib/permisos.js';

	const indicadores = [
		{ endpoint: '/estudiantes/resumen', label: 'Estudiantes', countField: 'cantidad' },
		{ endpoint: '/actividades/', label: 'Actividades' },
		{ endpoint: '/inscripciones/resumen', label: 'Inscripciones', countField: 'inscritos' },
		{ endpoint: '/asistencias/resumen', label: 'Asistencias', countField: 'cantidad' },
		{ endpoint: '/autorizaciones/resumen', label: 'Autorizaciones', countField: 'cantidad' }
	];

	// Bienestar y Orientación siguen estudiantes, participación y asistencia; no consultan autorizaciones.
	const sinAutorizaciones = leerGrupoRolActivo() === 'bienestar';
	const datasets = sinAutorizaciones
		? indicadores.filter((item) => item.endpoint !== '/autorizaciones/resumen')
		: indicadores;
</script>
<ApiOverview title="Analítica" {datasets} />

