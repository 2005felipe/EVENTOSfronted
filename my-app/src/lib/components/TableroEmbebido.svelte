<script>
	import { onMount } from 'svelte';
	import { apiGet } from '$lib/api.js';

	let marco;
	let filas = null;
	let error = $state('');
	let cargando = $state(true);

	function enviar() {
		if (marco?.contentWindow && filas) {
			marco.contentWindow.postMessage({ tipo: 'tablero:datos', filas }, window.location.origin);
		}
	}

	async function cargar() {
		cargando = true;
		error = '';
		try {
			filas = await apiGet('/tablero/inscripciones');
			enviar();
		} catch (cause) {
			console.error('Error cargando el tablero:', cause);
			error = 'No fue posible cargar los datos del tablero.';
		} finally {
			cargando = false;
		}
	}

	onMount(() => {
		function alRecibir(evento) {
			if (evento.origin !== window.location.origin) return;
			if (evento.data?.tipo === 'tablero:listo') enviar();
		}
		window.addEventListener('message', alRecibir);
		cargar();
		return () => window.removeEventListener('message', alRecibir);
	});
</script>

{#if error}
	<div class="alert alert-danger" role="alert">
		{error}
		<button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick={cargar}>Reintentar</button>
	</div>
{/if}

<iframe
	bind:this={marco}
	src="/tablero.html"
	title="Tablero de actividades e inscripciones"
	onload={enviar}
	style="width:100%; height:1000px; border:0;"
></iframe>