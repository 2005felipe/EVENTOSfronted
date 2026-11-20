export function descomponerHora(valor) {
	const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d+)?)?$/.exec(String(valor ?? ''));
	if (!coincidencia) return { hora: '', minuto: '00', periodo: 'AM', segundos: '00' };

	const hora24 = Number(coincidencia[1]);
	return {
		hora: String(hora24 % 12 || 12),
		minuto: coincidencia[2],
		periodo: hora24 < 12 ? 'AM' : 'PM',
		segundos: `${coincidencia[3] ?? '00'}${coincidencia[4] ?? ''}`
	};
}

export function componerHora(partes) {
	if (!partes.hora) return '';

	const hora12 = Number(partes.hora);
	const minuto = Number(partes.minuto);
	if (!Number.isInteger(hora12) || hora12 < 1 || hora12 > 12 || !Number.isInteger(minuto) || minuto < 0 || minuto > 59) {
		return '';
	}

	const hora24 = (hora12 % 12) + (partes.periodo === 'PM' ? 12 : 0);
	return `${String(hora24).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;
}

export function formatearHora(valor) {
	const { hora, minuto, periodo } = descomponerHora(valor);
	return hora ? `${hora}:${minuto} ${periodo}` : '';
}
