<script>
	import { onMount } from 'svelte';
	import { apiGet, suscribirCambiosApi } from '$lib/api.js';
	import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
	import LoadingState from '$lib/components/LoadingState.svelte';
	import PageHeading from '$lib/components/PageHeading.svelte';

	let actividades = $state([]);
	let cupos = $state([]);
	let fechaVista = $state(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
	let cargando = $state(true);
	let error = $state('');

	const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
	const hoyClave = claveFecha(new Date());
	let nombreMes = $derived(new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(fechaVista));
	let celdas = $derived.by(() => {
		const primerDia = new Date(fechaVista.getFullYear(), fechaVista.getMonth(), 1);
		const inicio = new Date(fechaVista.getFullYear(), fechaVista.getMonth(), 1 - ((primerDia.getDay() + 6) % 7));
		return Array.from({ length: 42 }, (_, indice) => {
			const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
			const clave = claveFecha(fecha);
			const eventos = actividades.filter((item) => String(item.fecha ?? '').slice(0, 10) === clave);
			return { fecha, clave, perteneceAlMes: fecha.getMonth() === fechaVista.getMonth(), eventos };
		});
	});

	function activo(estado) {
		return estado === true || estado === 1 || ['true', '1', 'activo', 'active'].includes(String(estado ?? '').trim().toLowerCase());
	}

	function claveFecha(fecha) {
		return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
	}

	function moverMes(delta) {
		fechaVista = new Date(fechaVista.getFullYear(), fechaVista.getMonth() + delta, 1);
	}

	function volverAHoy() {
		const hoy = new Date();
		fechaVista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
	}

	function inscritos(actividadId) {
		return Number(cupos.find((item) => Number(item.actividad_id) === Number(actividadId))?.inscritos ?? 0);
	}

	function formatoFecha(fecha) {
		return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(fecha);
	}

	async function cargar() {
		cargando = true;
		error = '';
		try {
			const [actividadesApi, cuposApi] = await Promise.all([
				apiGet('/actividades/'),
				apiGet('/inscripciones/resumen')
			]);
			if (!Array.isArray(actividadesApi) || !Array.isArray(cuposApi)) {
				throw new Error('La API devolvió información incompleta del calendario.');
			}
			actividades = actividadesApi;
			cupos = cuposApi;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'No fue posible cargar el calendario.';
		} finally {
			cargando = false;
		}
	}

	onMount(() => {
		void cargar();
		const unsubscribeApi = suscribirCambiosApi(() => void cargar());
		return () => unsubscribeApi();
	});
</script>

<svelte:head><title>Calendario y cupos | Eventos Escolares</title></svelte:head>

<main class="container-fluid px-3 px-lg-4 py-4">
	<div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
		<PageHeading title="Calendario y eventos" eyebrow="Gestión escolar" icon="bi-calendar3" />
		<div class="d-flex flex-wrap gap-2"><a class="btn btn-outline-primary" href="/actividades"><i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Actividades</a><button class="btn btn-outline-primary" type="button" onclick={cargar} disabled={cargando}><i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Actualizar</button></div>
	</div>
	{#if error}<FeedbackMessage variant="danger" message={error} />{/if}
	{#if cargando}<LoadingState label="Cargando calendario..." />{:else if actividades.length === 0}<div class="alert alert-info" role="status">No hay actividades disponibles para este perfil.</div>{:else}
		<section class="card border-0 shadow-sm" aria-labelledby="calendario-titulo">
			<div class="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
				<div><h2 class="h5 mb-0 text-capitalize" id="calendario-titulo">{nombreMes}</h2><span class="small text-secondary">{actividades.length} actividades visibles</span></div>
				<div class="btn-group" role="group" aria-label="Cambiar mes"><button class="btn btn-outline-secondary" type="button" onclick={() => moverMes(-1)} aria-label="Mes anterior"><i class="bi bi-chevron-left" aria-hidden="true"></i></button><button class="btn btn-outline-secondary" type="button" onclick={volverAHoy}>Hoy</button><button class="btn btn-outline-secondary" type="button" onclick={() => moverMes(1)} aria-label="Mes siguiente"><i class="bi bi-chevron-right" aria-hidden="true"></i></button></div>
			</div>
			<div class="table-responsive"><div class="calendar-grid">
				{#each diasSemana as dia (dia)}<div class="calendar-weekday">{dia}</div>{/each}
				{#each celdas as celda (celda.clave)}
					<section class="calendar-day" class:calendar-day-muted={!celda.perteneceAlMes} class:calendar-day-today={celda.clave === hoyClave} class:calendar-day-weekend={celda.fecha.getDay() === 0 || celda.fecha.getDay() === 6} aria-label={formatoFecha(celda.fecha)}>
						<strong class="calendar-date">{celda.fecha.getDate()}</strong>
						{#each celda.eventos as actividad (actividad.id)}
							<article class="calendar-event" class:calendar-event-inactive={!activo(actividad.estado)} class:calendar-event-past={activo(actividad.estado) && String(actividad.fecha).slice(0, 10) < hoyClave}>
								<strong>{actividad.nombre}</strong><span>{actividad.hora ?? 'Hora por confirmar'} · {actividad.lugar ?? 'Lugar por confirmar'}</span>
								{#if activo(actividad.estado) && String(actividad.fecha).slice(0, 10) >= claveFecha(new Date())}
									<small>{Math.max(Number(actividad.cupo ?? 0) - inscritos(actividad.id), 0)} cupos disponibles</small>
								{:else}<small>{activo(actividad.estado) ? 'Actividad finalizada' : 'Actividad inactiva'}</small>{/if}
							</article>
						{/each}
					</section>
				{/each}
			</div></div>
		</section>
	{/if}
</main>

<style>
	.calendar-grid { min-width: 980px; display: grid; grid-template-columns: repeat(7, minmax(130px, 1fr)); background: #fffefc; }
	@media (max-width: 767.98px) {
		.calendar-grid { min-width: 0 !important; grid-template-columns: 1fr !important; }
	}
	.calendar-weekday { padding: .8rem .65rem; text-align: center; font-size: .61rem; font-weight: 500; letter-spacing: .22em; text-transform: uppercase; color: var(--ee-ink-3); background: linear-gradient(180deg, #fffefc, #f3efe6); border-bottom: 3px double var(--ee-line-strong); border-right: 1px solid var(--ee-line); }
	.calendar-day { position: relative; min-height: 148px; padding: .55rem; border-right: 1px solid var(--ee-line); border-bottom: 1px solid var(--ee-line); overflow: hidden; background: linear-gradient(180deg, #fff, #fbfdff); transition: background-color .6s var(--ee-ease), box-shadow .6s var(--ee-ease); }
	.calendar-day:hover { background: #f4f9fc; }
	.calendar-day-weekend { background: linear-gradient(180deg, #f8fbfe, #f4f9fc); }
	.calendar-day-muted { background: #f4f7fa; color: #a0adba; }
	.calendar-day-muted .calendar-date { color: #a0adba; font-weight: 500; }
	.calendar-date { display: inline-flex; align-items: center; justify-content: center; min-width: 1.8rem; height: 1.8rem; margin-bottom: .45rem; padding: 0 .3rem; border: 1px solid transparent; border-radius: 8px; font-family: var(--ee-serif); font-size: 1rem; font-weight: 600; color: var(--ee-ink-2); transition: all .6s var(--ee-ease); }
	.calendar-day-today { background: linear-gradient(180deg, #eff7fc 0%, #fff 75%); box-shadow: inset 0 0 0 1px rgba(126,166,197,.4); z-index: 1; }
	.calendar-day-today .calendar-date { border-color: #d2e1ed; border-radius: 8px; background: #e6f1f8; color: #527895; box-shadow: none; }
	.calendar-event { display: grid; gap: .2rem; margin-bottom: .4rem; padding: .48rem .55rem; border: 1px solid #deebf4; border-left: 2px solid #a9c5da; border-radius: 8px; background: #f5faff; color: var(--ee-ink); font-size: .7rem; line-height: 1.3; box-shadow: inset 0 1px 0 #fff, 0 .2rem .6rem rgba(94,132,161,.045); transition: transform .6s var(--ee-ease), box-shadow .6s var(--ee-ease); cursor: default; }
	.calendar-event:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 #fff, 0 .5rem 1rem rgba(60,45,20,.12); }
	.calendar-event strong { color: #4e718d; font-family: var(--ee-serif); font-size: .95rem; font-weight: 600; }
	.calendar-event-past { border-color: #e3ebf1; border-left-color: #aebbc5; background: #f6f8fa; }
	.calendar-event-inactive { border-color: #e3ebf1; border-left-color: #a7b5c0; background: #f6f8fa; }
	.calendar-event span, .calendar-event small { color: var(--ee-ink-3); }
	.calendar-event small { font-size: .62rem; letter-spacing: .04em; }
	.calendar-event:not(.calendar-event-past):not(.calendar-event-inactive) small { color: #6389a7; font-weight: 600; }
</style>

