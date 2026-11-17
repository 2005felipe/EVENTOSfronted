<script>
    import { onMount } from 'svelte';
    import { apiGet, suscribirCambiosApi } from '$lib/api.js';
    import { leerPerfilAutenticado } from '$lib/auth.js';
    import { obtenerRutasPermitidas } from '$lib/modulos.js';
    import PageHeading from '$lib/components/PageHeading.svelte';
    import FeedbackMessage from '$lib/components/FeedbackMessage.svelte';
    import StatCard from '$lib/components/StatCard.svelte';

    let { title, datasets, eyebrow = '', icon = '', accesos = false } = $props();
    let counts = $state([]);
    let loading = $state(true);
    let error = $state('');
    let perfil = $state(null);

    /* Icono y color de cada indicador según su etiqueta. */
    const reglasIndicador = [
        [/estudiant/i, 'bi-mortarboard-fill', 'primary'],
        [/actividad/i, 'bi-calendar-event', 'info'],
        [/inscrip|particip/i, 'bi-pencil-square', 'success'],
        [/asisten/i, 'bi-person-check', 'warning'],
        [/autoriz/i, 'bi-file-earmark-check', 'primary'],
        [/acudient/i, 'bi-people-fill', 'info'],
        [/cuenta|usuario/i, 'bi-person-gear', 'success'],
        [/notific/i, 'bi-bell', 'warning']
    ];
    function estiloIndicador(label) {
        const regla = reglasIndicador.find(([patron]) => patron.test(label ?? ''));
        return regla ? { icon: regla[1], tone: regla[2] } : { icon: 'bi-bar-chart', tone: 'primary' };
    }

    const iconosModulo = {
        usuarios: 'bi-people', roles: 'bi-shield-lock', actividades: 'bi-calendar-event',
        inscripciones: 'bi-pencil-square', autorizaciones: 'bi-file-earmark-check', asistencia: 'bi-person-check',
        reportes: 'bi-card-list', analitica: 'bi-clipboard-data', estudiantes: 'bi-mortarboard',
        acudientes: 'bi-people-fill', categorias: 'bi-tags', bienestar: 'bi-heart-pulse',
        notificaciones: 'bi-bell', calendario: 'bi-calendar3'
    };

    let atajos = $derived(
        obtenerRutasPermitidas(perfil?.modulos).map((modulo) => ({
            ruta: modulo.ruta,
            nombre: modulo.nombre,
            icono: modulo.icono ?? iconosModulo[modulo.key] ?? 'bi-grid'
        }))
    );

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const fechaHoy = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    let primerNombre = $derived(String(perfil?.usuario?.nombre ?? '').trim().split(/\s+/)[0] || '');

    async function loadCounts() {
        loading = true;
        error = '';
        try {
            counts = await Promise.all(datasets.map(async (dataset) => {
                const rows = await apiGet(dataset.endpoint);
                if (!Array.isArray(rows)) throw new Error('La API no devolvió una lista válida.');
                const resumenes = dataset.countField
                    ? rows.filter((row) => row?.[dataset.countField] !== null && row?.[dataset.countField] !== undefined)
                    : [];
                const count = resumenes.length > 0
                    ? resumenes.reduce((total, row) => total + Number(row[dataset.countField] ?? 0), 0)
                    : rows.length;
                return { ...dataset, count };
            }));
        } catch (cause) {
            console.error('Error cargando indicadores:', cause);
            error = cause instanceof Error ? cause.message : 'No fue posible cargar los indicadores.';
        } finally {
            loading = false;
        }
    }

    function leerPerfil() {
        perfil = leerPerfilAutenticado();
    }

    onMount(() => {
        leerPerfil();
        window.addEventListener('perfil-portal-cambiado', leerPerfil);
        void loadCounts();
        const unsubscribeApi = suscribirCambiosApi(() => void loadCounts());
        return () => {
            unsubscribeApi();
            window.removeEventListener('perfil-portal-cambiado', leerPerfil);
        };
    });
</script>

<svelte:head><title>{title} | Eventos Escolares</title></svelte:head>

<main class="container py-4">
    {#if accesos}
        <section class="ee-hero mb-4">
            <div class="ee-hero-text">
                <span class="ee-hero-date"><i class="bi bi-calendar3 me-2" aria-hidden="true"></i>{fechaHoy}</span>
                <h1 class="ee-hero-title">{saludo}{primerNombre ? `, ${primerNombre}` : ''}</h1>
                <p class="ee-hero-sub">{title}{perfil?.rol?.nombre ? ` · ${perfil.rol.nombre}` : ''}</p>
            </div>
            <button class="btn btn-light ee-hero-btn" type="button" onclick={loadCounts} disabled={loading}>
                <i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Actualizar
            </button>
            <i class="bi bi-mortarboard-fill ee-hero-mark" aria-hidden="true"></i>
        </section>
    {:else}
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
            <PageHeading {title} {eyebrow} {icon} />
            <button class="btn btn-outline-primary" type="button" onclick={loadCounts} disabled={loading}>
                <i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Actualizar
            </button>
        </div>
    {/if}

    {#if loading}
        <div class="row g-3" role="status" aria-live="polite" aria-label="Cargando indicadores">
            {#each datasets as dataset (dataset.endpoint)}
                <div class="col-6 col-xl-3"><div class="ee-skeleton" style="height: 6.6rem; border-radius: 1.15rem;"></div></div>
            {/each}
        </div>
    {:else if error}
        <FeedbackMessage variant="danger" message={error} />
    {:else}
        {#if accesos}<h2 class="ee-section-title">Resumen</h2>{/if}
        <div class="row g-3">
            {#each counts as item (item.endpoint)}
                {@const estilo = estiloIndicador(item.label)}
                <div class="col-6 col-xl-3">
                    <StatCard label={item.label} value={item.count} icon={estilo.icon} tone={estilo.tone} hint="registros" />
                </div>
            {/each}
        </div>
    {/if}

    {#if accesos && atajos.length}
        <h2 class="ee-section-title mt-5">Accesos rápidos</h2>
        <div class="row g-3">
            {#each atajos as atajo (atajo.ruta)}
                <div class="col-6 col-md-4 col-xl-3">
                    <a class="ee-quick" href={atajo.ruta}>
                        <span class="ee-quick-icon"><i class={`bi ${atajo.icono}`} aria-hidden="true"></i></span>
                        <span class="ee-quick-name">{atajo.nombre}</span>
                        <i class="bi bi-arrow-right ee-quick-arrow" aria-hidden="true"></i>
                    </a>
                </div>
            {/each}
        </div>
    {/if}
</main>
