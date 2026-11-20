<script>
    import { onMount, tick } from 'svelte';
    import { Chart, registerables } from 'chart.js';
    import { API_BASE_URL } from '$lib/api.js';
    import { leerToken } from '$lib/auth.js';

    Chart.register(...registerables);

    const PALETA = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550', '#197278', '#1AAB40', '#15C6F4', '#4092FF', '#FFA058', '#BE5DC9', '#F472D0', '#B5A1FF'];
    const AZUL = '#118DFF';

    let todas = [], error = '', cargando = true, movil = false;
    let selFecha = [], selActividad = [], selMes = [], selGrado = [], selAut = [], selCategoria = [], selAsis = [];
    let lienzos = {}, graficos = {};

    const norm = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const dia = (f) => String(f.fecha_inscripcion ?? '').slice(0, 10);

    // Cómo se lee cada dimensión de una fila
    const DIM = {
        fecha: (f) => dia(f) || 'Sin dato',
        actividad: (f) => {
    const t = String(f.actividad || 'Sin dato').trim().toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
},
        mes: (f) => dia(f).slice(0, 7) || 'Sin dato',
        grado: (f) => f.grado || 'Sin dato',
        aut: (f) => f.estado_autorizacion || 'Sin dato',
        categoria: (f) => f.categoria || 'Sin dato',
        asis: (f) => f.asistencia || 'Sin dato'
    };
    const NOMBRE_DIM = { fecha: 'Fecha', actividad: 'Actividad', mes: 'Mes', grado: 'Grado', aut: 'Autorización', categoria: 'Categoría', asis: 'Asistencia' };

    const contar = (arr, fn) => {
        const m = new Map();
        arr.forEach((x) => { const k = fn(x); m.set(k, (m.get(k) || 0) + 1); });
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const fechaLarga = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };
    const nombreMes = (k) => {
        const [y, m] = k.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    };
    const textoValor = (dim, v) => (dim === 'fecha' ? fechaLarga(v) : dim === 'mes' ? nombreMes(v) : v);
    const fmt = (n) => n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';
    const altoBarras = (n) => Math.max(200, n * 26 + 50);
    const altoTorta = (n) => (movil ? 230 + n * 20 : 300);

    // Filtrar: el gráfico "excluir" ignora su propia selección (así se ve completo y resaltado)
    function filtrar(datos, s, excluir) {
        return datos.filter((f) =>
            Object.keys(DIM).every((d) => d === excluir || !s[d].length || s[d].includes(DIM[d](f)))
        );
    }

    $: sels = { fecha: selFecha, actividad: selActividad, mes: selMes, grado: selGrado, aut: selAut, categoria: selCategoria, asis: selAsis };

    // Opciones de las casillas
    $: fechas = [...new Set(todas.map((f) => dia(f)).filter(Boolean))].sort();
    $: categorias = [...new Set(todas.map((f) => f.categoria).filter(Boolean))].sort();
    $: grados = [...new Set(todas.map((f) => f.grado).filter(Boolean))].sort();

    // Tarjetas
    $: filas = filtrar(todas, sels, null);
    $: kActividades = new Set(filas.map((f) => DIM.actividad(f))).size;
    $: kInscripciones = filas.length;
    $: kAut = filas.length
        ? (filas.filter((f) => norm(f.estado_autorizacion) === 'autorizada').length * 100) / filas.length : 0;
    $: asistio = filas.filter((f) => norm(f.asistencia) === 'asistio').length;
    $: noAsistio = filas.filter((f) => norm(f.asistencia) === 'no asistio').length;
    $: kAsis = asistio + noAsistio ? (asistio * 100) / (asistio + noAsistio) : 0;

    // Datos de cada gráfico
    $: porActividad = contar(filtrar(todas, sels, 'actividad'), DIM.actividad);
    $: porGrado = contar(filtrar(todas, sels, 'grado'), DIM.grado);
    $: porMes = contar(filtrar(todas, sels, 'mes'), DIM.mes)
        .filter((p) => p[0] !== 'Sin dato').sort((a, b) => (a[0] < b[0] ? -1 : 1));
    $: porAut = contar(filtrar(todas, sels, 'aut'), DIM.aut);
    $: porCat = contar(filtrar(todas, sels, 'categoria'), DIM.categoria);
    $: porAsis = contar(filtrar(todas, sels, 'asis'), DIM.asis);

    // Etiquetas de filtros activos
    $: chips = Object.keys(sels).flatMap((d) => sels[d].map((v) => ({ dim: d, v, texto: `${NOMBRE_DIM[d]}: ${textoValor(d, v)}` })));

    $: if (!cargando) { sels; todas; movil; tick().then(dibujar); }

    function alternar(dim, v) {
        const t = (a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
        if (dim === 'fecha') selFecha = t(selFecha);
        else if (dim === 'actividad') selActividad = t(selActividad);
        else if (dim === 'mes') selMes = t(selMes);
        else if (dim === 'grado') selGrado = t(selGrado);
        else if (dim === 'aut') selAut = t(selAut);
        else if (dim === 'categoria') selCategoria = t(selCategoria);
        else if (dim === 'asis') selAsis = t(selAsis);
    }

    function limpiar() {
        selFecha = []; selActividad = []; selMes = []; selGrado = []; selAut = []; selCategoria = []; selAsis = [];
    }

    async function cargar() {
        error = '';
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

    function cursor(e, els) {
        const t = e?.native?.target;
        if (t) t.style.cursor = els.length ? 'pointer' : 'default';
    }

    function barras(id, pares, dim, etiqueta = (k) => k) {
        graficos[id]?.destroy();
        if (!lienzos[id] || !pares.length) return;
        const sel = sels[dim];
        graficos[id] = new Chart(lienzos[id], {
            type: 'bar',
            data: {
                labels: pares.map((p) => etiqueta(p[0])),
                datasets: [{
                    data: pares.map((p) => p[1]),
                    backgroundColor: pares.map((p) => (sel.length && !sel.includes(p[0]) ? AZUL + '44' : AZUL)),
                    borderRadius: 2
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                animation: { duration: 250 },
                onClick: (e, els) => { if (els.length) alternar(dim, pares[els[0].index][0]); },
                onHover: cursor,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 } },
                    y: { ticks: { autoSkip: false, font: { size: 11 } } }
                }
            }
        });
    }

    function torta(id, pares, dim) {
        graficos[id]?.destroy();
        if (!lienzos[id] || !pares.length) return;
        const sel = sels[dim];
        const total = pares.reduce((s, p) => s + p[1], 0);
        graficos[id] = new Chart(lienzos[id], {
            type: 'pie',
            data: {
                labels: pares.map((p) => `${p[0]} — ${p[1]} (${Math.round((p[1] * 100) / total)}%)`),
                datasets: [{
                    data: pares.map((p) => p[1]),
                    backgroundColor: pares.map((p, i) => {
                        const c = PALETA[i % PALETA.length];
                        return sel.length && !sel.includes(p[0]) ? c + '44' : c;
                    }),
                    offset: pares.map((p) => (sel.includes(p[0]) ? 14 : 0))
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 250 },
                onClick: (e, els) => { if (els.length) alternar(dim, pares[els[0].index][0]); },
                onHover: cursor,
                plugins: {
                    legend: {
                        position: movil ? 'bottom' : 'right',
                        labels: { boxWidth: 12, font: { size: 11 } },
                        onClick: (e, item) => alternar(dim, pares[item.index][0])
                    }
                }
            }
        });
    }

    function dibujar() {
        barras('act', porActividad, 'actividad');
        barras('mes', porMes, 'mes', nombreMes);
        barras('gra', porGrado, 'grado');
        torta('aut', porAut, 'aut');
        torta('cat', porCat, 'categoria');
        torta('asi', porAsis, 'asis');
    }

    onMount(() => {
        const medir = () => { movil = window.innerWidth < 700; };
        medir();
        window.addEventListener('resize', medir);
        cargar();
        return () => {
            window.removeEventListener('resize', medir);
            Object.values(graficos).forEach((g) => g?.destroy());
        };
    });
</script>

<div class="lienzo-pbi">
    {#if error}
        <p class="aviso">{error} <button class="boton" on:click={cargar}>Reintentar</button></p>
    {:else if cargando}
        <p class="aviso">Cargando…</p>
    {:else}
        <div class="barra">
            <span class="ayuda">Toca una barra o sección para filtrar. Tócala otra vez para quitar el filtro.</span>
            <div class="acciones">
                <button class="boton" on:click={cargar}>Actualizar</button>
                {#if chips.length}<button class="boton" on:click={limpiar}>Limpiar filtros</button>{/if}
            </div>
        </div>

        {#if chips.length}
            <div class="chips">
                {#each chips as c}
                    <button class="chip" on:click={() => alternar(c.dim, c.v)}>{c.texto} <b>×</b></button>
                {/each}
            </div>
        {/if}

        <div class="estructura">
            <details class="lateral" open={!movil}>
                <summary>Filtros</summary>

                <h4>fecha_inscripcion</h4>
                <div class="lista">
                    {#each fechas as x}
                        <label><input type="checkbox" bind:group={selFecha} value={x} /> {fechaLarga(x)}</label>
                    {/each}
                </div>

                <h4>categoria</h4>
                <div class="lista">
                    {#each categorias as x}
                        <label><input type="checkbox" bind:group={selCategoria} value={x} /> {x}</label>
                    {/each}
                </div>

                <h4>grado</h4>
                <div class="lista">
                    {#each grados as x}
                        <label><input type="checkbox" bind:group={selGrado} value={x} /> {x}</label>
                    {/each}
                </div>
            </details>

            <div class="principal">
                <section class="kpis">
                    <div class="kpi"><span>Recuento de actividad</span><strong>{kActividades}</strong></div>
                    <div class="kpi"><span>Recuento de actividad</span><strong>{kInscripciones}</strong></div>
                    <div class="kpi"><span>% Autorizadas</span><strong>{fmt(kAut)}</strong></div>
                    <div class="kpi"><span>% Asistencia</span><strong>{fmt(kAsis)}</strong></div>
                </section>

                {#if filas.length}
                    <section class="rejilla">
                        <div class="tarjeta">
                            <h3>Recuento de actividad</h3><p>por actividad</p>
                            <div class="caja" style="height:{altoBarras(porActividad.length)}px"><canvas bind:this={lienzos.act}></canvas></div>
                        </div>
                        <div class="tarjeta">
                            <h3>Recuento de fecha_inscripcion</h3><p>por Mes</p>
                            <div class="caja" style="height:{altoBarras(porMes.length)}px"><canvas bind:this={lienzos.mes}></canvas></div>
                        </div>
                        <div class="tarjeta">
                            <h3>Recuento de actividad</h3><p>por grado</p>
                            <div class="caja" style="height:{altoBarras(porGrado.length)}px"><canvas bind:this={lienzos.gra}></canvas></div>
                        </div>
                        <div class="tarjeta">
                            <h3>Recuento de actividad</h3><p>por estado_autorizacion</p>
                            <div class="caja" style="height:{altoTorta(porAut.length)}px"><canvas bind:this={lienzos.aut}></canvas></div>
                        </div>
                        <div class="tarjeta">
                            <h3>Recuento de actividad</h3><p>por categoria</p>
                            <div class="caja" style="height:{altoTorta(porCat.length)}px"><canvas bind:this={lienzos.cat}></canvas></div>
                        </div>
                        <div class="tarjeta">
                            <h3>Recuento de actividad</h3><p>por asistencia</p>
                            <div class="caja" style="height:{altoTorta(porAsis.length)}px"><canvas bind:this={lienzos.asi}></canvas></div>
                        </div>
                    </section>
                {:else}
                    <p class="aviso">No hay inscripciones con esos filtros. Quita alguno de los filtros activos.</p>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .lienzo-pbi { background: #f3f3f3; padding: .75rem; border-radius: 8px; font-family: 'Segoe UI', system-ui, sans-serif; color: #252423; }
    .barra { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
    .ayuda { font-size: .75rem; color: #605e5c; }
    .acciones { display: flex; gap: .4rem; }
    .boton { padding: .35rem .7rem; border: 1px solid #c8c6c4; background: #fff; border-radius: 4px; cursor: pointer; font-size: .8rem; }
    .boton:hover { background: #eef5ff; border-color: #118dff; }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .6rem; }
    .chip { padding: .25rem .6rem; border: 1px solid #118dff; background: #e6f2ff; color: #0b5cad; border-radius: 999px; cursor: pointer; font-size: .75rem; }
    .chip b { margin-left: .25rem; }
    .estructura { display: flex; flex-direction: column; gap: .75rem; }
    .principal { display: flex; flex-direction: column; gap: .75rem; min-width: 0; }
    .lateral { background: #fff; border-radius: 4px; padding: .6rem .75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .lateral summary { font-weight: 600; cursor: pointer; }
    .lateral h4 { margin: .8rem 0 .3rem; font-size: .75rem; font-weight: 600; }
    .lista { max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; }
    .lista label { display: flex; gap: .4rem; align-items: center; cursor: pointer; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: .6rem; }
    .kpi { background: #fff; border-radius: 4px; padding: .8rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); display: flex; flex-direction: column; gap: .35rem; }
    .kpi span { font-size: .8rem; color: #605e5c; }
    .kpi strong { font-size: 1.5rem; font-weight: 600; }
    .rejilla { display: grid; grid-template-columns: 1fr; gap: .6rem; }
    .tarjeta { background: #fff; border-radius: 4px; padding: .8rem 1rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); min-width: 0; }
    .tarjeta h3 { margin: 0; font-size: .85rem; font-weight: 600; }
    .tarjeta p { margin: 0 0 .5rem; font-size: .75rem; color: #605e5c; }
    .caja { position: relative; }
    .aviso { padding: 1rem; background: #fff; border-radius: 6px; }
    @media (min-width: 900px) {
        .estructura { flex-direction: row; align-items: flex-start; }
        .principal { flex: 1; }
        .lateral { order: 2; width: 270px; flex-shrink: 0; }
        .kpis { grid-template-columns: repeat(4, 1fr); }
        .rejilla { grid-template-columns: repeat(3, 1fr); }
    }
</style>