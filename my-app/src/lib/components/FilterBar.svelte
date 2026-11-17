<script>
	import { onMount, tick } from 'svelte';

	/* Barra de filtros compartida por todos los listados del portal.
	   Recibe los campos como contenido y, opcionalmente, la función que limpia los filtros. */
	let { titulo = 'Filtros', onClear = null, borde = true, children } = $props();

	let abierto = $state(true);
	let activos = $state(0);
	let cuerpo = $state(null);

	/* Los selectores de orden no cuentan como filtros activos. */
	function esOrden(el) {
		return /orden|direccion/i.test(el.id ?? '');
	}

	function contar() {
		if (!cuerpo) return;
		let total = 0;
		cuerpo.querySelectorAll('input, select').forEach((el) => {
			if (esOrden(el)) {
				el.classList.remove('ee-filtro-activo');
				return;
			}
			const activo = el.tagName === 'SELECT' ? el.selectedIndex > 0 : el.value !== '';
			el.classList.toggle('ee-filtro-activo', activo);
			if (activo) total++;
		});
		activos = total;
	}

	async function limpiar() {
		onClear?.();
		await tick();
		contar();
	}

	onMount(() => {
		contar();
	});
</script>

<div class="ee-filterbar" class:ee-filterbar-plano={!borde}>
	<div class="ee-filterbar-head">
		<button
			class="ee-filterbar-toggle"
			type="button"
			aria-expanded={abierto}
			onclick={() => (abierto = !abierto)}
		>
			<span class="ee-filterbar-icon"><i class="bi bi-funnel-fill" aria-hidden="true"></i></span>
			<span class="ee-filterbar-title">{titulo}</span>
			{#if activos > 0}
				<span class="ee-filterbar-count" aria-label={`${activos} filtros activos`}>{activos} {activos === 1 ? 'activo' : 'activos'}</span>
			{/if}
			<i class="bi bi-chevron-down ee-filterbar-chev" class:ee-rotado={!abierto} aria-hidden="true"></i>
		</button>
		{#if onClear}
			<button class="btn btn-sm ee-filterbar-clear" type="button" onclick={limpiar}>
				<i class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>Limpiar
			</button>
		{/if}
	</div>
	<div
		class="ee-filter-grid"
		class:ee-cerrado={!abierto}
		bind:this={cuerpo}
		oninput={contar}
		onchange={contar}
	>
		{@render children?.()}
	</div>
</div>
