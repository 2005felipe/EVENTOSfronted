<script>
	import { componerHora, descomponerHora } from '$lib/hora.js';

	let { value = $bindable(''), required = false } = $props();
	let partes = $derived(descomponerHora(value));
	const horas = Array.from({ length: 12 }, (_, indice) => String(indice + 1));
	const minutos = Array.from({ length: 60 }, (_, indice) => String(indice).padStart(2, '0'));

	function actualizar(campo, valor) {
		value = componerHora({ ...partes, [campo]: valor });
	}
</script>

<div class="d-flex gap-2">
	<select class="form-select" aria-label="Hora" value={partes.hora} onchange={(event) => actualizar('hora', event.currentTarget.value)} required={required}>
		<option value="">Hora</option>
		{#each horas as hora (hora)}<option value={hora}>{hora}</option>{/each}
	</select>
	<select class="form-select" aria-label="Minutos" value={partes.minuto} onchange={(event) => actualizar('minuto', event.currentTarget.value)} disabled={!partes.hora}>
		{#each minutos as minuto (minuto)}<option value={minuto}>{minuto}</option>{/each}
	</select>
	<select class="form-select" aria-label="AM o PM" value={partes.periodo} onchange={(event) => actualizar('periodo', event.currentTarget.value)} disabled={!partes.hora}>
		<option value="AM">AM</option>
		<option value="PM">PM</option>
	</select>
</div>
