<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import { apiGet, suscribirCambiosApi } from '$lib/api.js';
	import { guardarPerfilAutenticado, leerToken } from '$lib/auth.js';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.css';
	import 'datatables.net-bs5/css';
	import 'datatables.net-responsive-bs5/css';
	import '$lib/styles/theme.css';
	import '$lib/styles/theme-luxury.css';
	import { obtenerRutasPermitidas } from '$lib/modulos.js';

	let { children } = $props();
	let esLogin = $derived(page.url.pathname === '/');
	/* Fuera del login se empieza validando: evita mostrar un instante la página protegida. */
	let validandoPermiso = $state(page.url.pathname !== '/');
	let errorPermiso = $state('');
	let accesoDenegado = $state(false);
	let solicitudPermiso = 0;

	/* silencioso: revalidación tras guardar datos; no oculta la página ni pierde su estado (modales, filtros). */
	async function validarAcceso(ruta, { silencioso = false } = {}) {
		const solicitud = ++solicitudPermiso;
		if (!silencioso) {
			validandoPermiso = true;
			accesoDenegado = false;
		}
		errorPermiso = '';

		if (!leerToken()) {
			accesoDenegado = true;
			validandoPermiso = false;
			await goto('/', { replaceState: true });
			return;
		}

		try {
			// El perfil y sus permisos se vuelven a consultar a la API en cada ruta.
			const perfil = await apiGet('/auth/me');
			if (solicitud !== solicitudPermiso) return;
			guardarPerfilAutenticado(perfil);

			const modulos = Array.isArray(perfil?.modulos) ? perfil.modulos : [];
			/* Cada ruta exige su propio módulo activo; /calendario ya no se concede por Actividades. */
			const rutasPermitidas = obtenerRutasPermitidas(modulos);
			const permitido = ruta === '/inicio'
				? rutasPermitidas.length > 0
				: rutasPermitidas.some((modulo) => modulo.ruta === ruta);
			accesoDenegado = !permitido;
		} catch (cause) {
			if (solicitud !== solicitudPermiso) return;
			console.error('Error validando la sesión y los permisos:', cause);
			if (!leerToken()) {
				await goto('/', { replaceState: true });
			} else if (!silencioso) {
				/* Un fallo de red en la revalidación silenciosa no debe tapar la página abierta. */
				errorPermiso = 'No fue posible validar tu sesión. Revisa tu conexión e inténtalo de nuevo.';
			}
		} finally {
			if (solicitud === solicitudPermiso) validandoPermiso = false;
		}
	}

	$effect(() => {
		const ruta = page.url.pathname;
		if (ruta === '/') {
			solicitudPermiso++;
			validandoPermiso = false;
			errorPermiso = '';
			accesoDenegado = false;
			return;
		}
		void validarAcceso(ruta);
	});

	onMount(() => {
		function revalidarRutaActual() {
			const ruta = page.url.pathname;
			if (ruta !== '/') void validarAcceso(ruta, { silencioso: true });
		}

		function redirigirAlLogin() {
			void goto('/', { replaceState: true });
		}

		const unsubscribeData = suscribirCambiosApi(revalidarRutaActual);
		window.addEventListener('portal-sesion-expirada', redirigirAlLogin);
		return () => {
			unsubscribeData();
			window.removeEventListener('portal-sesion-expirada', redirigirAlLogin);
		};
	});
</script>

<svelte:head>
	<title>Eventos Escolares</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Jost:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<div class="portal-shell min-vh-100 d-flex flex-column bg-body-tertiary">
	<Header />
	{#if !esLogin}
		<Navbar />
	{/if}
	<div class="flex-grow-1 portal-content">
		{#if validandoPermiso}
			<div class="container py-5" role="status"><div class="spinner-border text-primary" aria-hidden="true"></div><p class="mt-3 mb-0">Verificando tu acceso...</p></div>
		{:else if errorPermiso}
			<div class="container py-4"><div class="alert alert-danger" role="alert">{errorPermiso} <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick={() => validarAcceso(page.url.pathname)}>Reintentar</button></div></div>
		{:else if accesoDenegado}
			<div class="container py-4"><div class="alert alert-warning" role="alert"><h1 class="h5">Acceso no disponible</h1><p class="mb-0">Tu perfil no tiene acceso a esta sección. Si crees que es un error, comunícate con la administración del colegio.</p></div></div>
		{:else}
			{@render children()}
		{/if}
	</div>
	<Footer />
</div>

<style>
	:global(.modal-dialog-scrollable .modal-content) {
		max-height: calc(100vh - 2rem);
		max-height: calc(100dvh - 2rem);
	}

	:global(.modal-dialog-scrollable .modal-content > form) {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	:global(.modal-dialog-scrollable .modal-body) {
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
	}

:global(.modal-dialog-scrollable .modal-content > form > .modal-body) {
    flex: 1 1 auto;
  }

  :global(body) {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>