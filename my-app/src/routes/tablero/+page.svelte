<script>
    import { onMount, tick } from 'svelte';
    import { Chart, registerables } from 'chart.js';
    import { API_BASE_URL } from '$lib/api.js';
    import { leerToken } from '$lib/auth.js';

    Chart.register(...registerables);

    const colores = ['#6f9bc0', '#e0a96d', '#7fb59a', '#c97b84', '#9b8ec4', '#d4c36a', '#6fb7b7'];
    let todas = [], error = '', cargando = true;
    let filtros = { categoria: '', grado: '', desde: '', hasta: '' };
    let lienzos = {}, graficos = {};

    const norm = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const esPositivo = (t) => /^(autorizad|aprobad|asistio|si$|presente)/.test(norm(t));
    const sinRegistro = (t) => ['', 'sin registro', 'sin dato', 'pendiente', 'sin asistencia'].includes(norm(t));
    const contar = (arr, fn) => {
        const m = new Map();
        arr.forEach((x) => { const k = fn(x) || 'Sin dato'; m.set(k, (m.get(k) || 0) + 1); });
        return [...m.entries()];
    };
    const pct = (a, b) => (b ? Math.round((a * 1000) / b) / 10 : 0);

    $: categorias = [...new Set(todas.map((f) => f.categoria).filter(Boolean))].sort();
    $: grados = [...new Set(todas.map((f) => f.grado).filter(Boolean))].sort();
    $: filas = todas.filter((f) => {
        const fecha = String(f.fecha_inscripcion ?? '').slice(0, 10);
        return (!filtros.categoria || f.categoria === filtros.categoria)
            && (!filtros.grado || f.grado === filtros.grado)
            && (!filtros.desde || fecha >= filtros.desde)
            && (!filtros.hasta || fecha <= filtros.hasta);
    });
    $: kpis = (() => {
        const conAsis = filas.filter((f) => !sinRegistro(f.asistencia));
        return {
            actividades: new Set(filas.map((f) => f.actividad)).size,
            inscripciones: filas.length,
            autorizadas: pct(filas.filter((f) => esPositivo(f.estado_autorizacion)).length, filas.length),
            asistencia: pct(conAsis.filter((f) => esPositivo(f.asistencia)).length, conAsis.length)
        };
    })();
    $: { filas; tick().then(dibujar); }

    async function cargar() {
        try {
            const r = await fetch(`${API_BASE_URL}/tablero/inscripciones`, {
                headers: { Authorization: `Bearer ${leerToken()}` }
            });
            if (!r.ok) throw new Error('No se pudo cargar el tablero');
            const j = await r.json();
            todas = Array.isArray(j) ? j : (j.datos ?? j.filas ?? j.items ?? []);
        } catch (e) {
            error = e.message;
        }
        cargando = false;
    }

    function pintar(id, tipo, labels, datasets) {
        if (!lienzos[id]) return;
        graficos[id]?.destroy();
        graficos[id] = new Chart(lienzos[id], {
            type: tipo,
            data: { labels, datasets },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function dibujar() {
        if (!lienzos.act || !filas.length) return;
        const torta = (pares) => [{ data: pares.map((p) => p[1]), backgroundColor: colores }];

        const porAct = contar(filas, (f) => f.actividad).sort((a, b) => b[1] - a[1]).slice(0, 12);
        pintar('act', 'bar', porAct.map((p) => p[0]),
            [{ label: 'Inscripciones', data: porAct.map((p) => p[1]), backgroundColor: colores[0] }]);

        const porFecha = contar(filas, (f) => String(f.fecha_inscripcion ?? '').slice(0, 10)).sort();
        pintar('fec', 'bar', porFecha.map((p) => p[0]),
            [{ label: 'Inscripciones', data: porFecha.map((p) => p[1]), backgroundColor: colores[1] }]);

        const top = porAct.slice(0, 8).map((p) => p[0]);
        const gr = [...new Set(filas.map((f) => f.grado))];
        pintar('gra', 'bar', top, gr.map((g, i) => ({
            label: g,
            backgroundColor: colores[i % colores.length],
            data: top.map((a) => filas.filter((f) => f.actividad === a && f.grado === g).length)
        })));

        const aut = contar(filas, (f) => f.estado_autorizacion);
        pintar('aut', 'doughnut', aut.map((p) => p[0]), torta(aut));
        const cat = contar(filas, (f) => f.categoria);
        pintar('cat', 'doughnut', cat.map((p) => p[0]), torta(cat));
        const asi = contar(filas, (f) => f.asistencia);
        pintar('asi', 'doughnut', asi.map((p) => p[0]), torta(asi));
    }

    onMount(() => {
        cargar();
        return () => Object.values(graficos).forEach((g) => g?.destroy());
    });
</script>

<main class="tablero">
    <h1>Tablero</h1>

    <section class="filtros">
        <select bind:value={filtros.categoria}>
            <option value="">Todas las categorías</option>
            {#each categorias as c}<option value={c}>{c}</option>{/each}
        </select>
        <select bind:value={filtros.grado}>
            <option value="">Todos los grados</option>
            {#each grados as g}<option value={g}>{g}</option>{/each}
        </select>
        <input type="date" bind:value={filtros.desde} />
        <input type="date" bind:value={filtros.hasta} />
    </section>

    {#if error}
        <p class="aviso">{error}</p>
    {:else if cargando}
        <p class="aviso">Cargando…</p>
    {:else}
        <section class="kpis">
            <div class="kpi"><span>Actividades</span><strong>{kpis.actividades}</strong></div>
            <div class="kpi"><span>Inscripciones</span><strong>{kpis.inscripciones}</strong></div>
            <div class="kpi"><span>% Autorizadas</span><strong>{kpis.autorizadas}%</strong></div>
            <div class="kpi"><span>% Asistencia</span><strong>{kpis.asistencia}%</strong></div>
        </section>

        {#if filas.length}
            <section class="rejilla">
                <div class="tarjeta"><h3>Inscripciones por actividad</h3><div class="lienzo"><canvas bind:this={lienzos.act}></canvas></div></div>
                <div class="tarjeta"><h3>Inscripciones por fecha</h3><div class="lienzo"><canvas bind:this={lienzos.fec}></canvas></div></div>
                <div class="tarjeta"><h3>Actividad por grado</h3><div class="lienzo"><canvas bind:this={lienzos.gra}></canvas></div></div>
                <div class="tarjeta"><h3>Autorización</h3><div class="lienzo"><canvas bind:this={lienzos.aut}></canvas></div></div>
                <div class="tarjeta"><h3>Categorías</h3><div class="lienzo"><canvas bind:this={lienzos.cat}></canvas></div></div>
                <div class="tarjeta"><h3>Asistencia</h3><div class="lienzo"><canvas bind:this={lienzos.asi}></canvas></div></div>
            </section>
        {:else}
            <p class="aviso">No hay inscripciones con esos filtros.</p>
        {/if}
    {/if}
</main>

<style>
    .tablero { padding: 1rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-family: 'Cormorant Garamond', serif; font-style: italic; color: #4a6078; }
    .filtros { display: grid; grid-template-columns: repeat(2, 1fr); gap: .5rem; margin: 1rem 0; }
    .filtros select, .filtros input { padding: .6rem; border: 1px solid #d6e2ee; border-radius: 10px; background: #fffdf9; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: .75rem; }
    .kpi { background: #fff; border: 1px solid #e3ecf4; border-radius: 14px; padding: 1rem; display: flex; flex-direction: column; box-shadow: 0 4px 14px rgba(111,155,192,.12); }
    .kpi span { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: #7d93a8; }
    .kpi strong { font-size: 1.9rem; color: #4a6078; }
    .rejilla { display: grid; grid-template-columns: 1fr; gap: .75rem; margin-top: .75rem; }
    .tarjeta { background: #fff; border: 1px solid #e3ecf4; border-radius: 14px; padding: 1rem; box-shadow: 0 4px 14px rgba(111,155,192,.12); }
    .tarjeta h3 { margin: 0 0 .5rem; font-size: .95rem; color: #4a6078; }
    .lienzo { position: relative; height: 240px; }
    .aviso { padding: 1rem; background: #f6f3ee; border-radius: 10px; }
    @media (min-width: 800px) {
        .filtros { grid-template-columns: repeat(4, 1fr); }
        .kpis { grid-template-columns: repeat(4, 1fr); }
        .rejilla { grid-template-columns: repeat(3, 1fr); }
    }
</style>