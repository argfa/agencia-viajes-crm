async function main() {
  try {
    // 1. Crear el cliente
    console.log("Enviando POST a http://localhost:3000/api/clients...");
    const resPost = await fetch("http://localhost:3000/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destino: "Los Roques",
        fecha_salida: "2026-12-01T08:00:00.000Z",
        fecha_retorno: "2026-12-05T18:00:00.000Z",
        nombre: "Carmen",
        apellido: "Rojas",
        cedula: "11222333",
        edad: "45",
        monto_total: 1000,
        reserva_inicial: 300,
        abonos: 0,
        restante_por_pagar: 700,
        metodo_pago: "Efectivo",
        vendedor: "Sistema Automático",
        cantidad_pax: "1",
        acompanantes: ""
      })
    });
    
    if (!resPost.ok) throw new Error("Fallo al crear cliente: " + resPost.statusText);
    const client = await resPost.json();
    console.log("Cliente creado:", client.nombre, client.apellido, "ID:", client.id);

    // 2. Aplicar un ABONO
    console.log("Enviando PUT para aplicar abono de $200...");
    const resPut = await fetch("http://localhost:3000/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: client.id,
        abonos: 200,                // El nuevo total de abonos
        restante_por_pagar: 500,    // 700 deuda - 200 abono nuevo = 500
        monto_involucrado: 200      // El monto específico de ESTE recibo
      })
    });

    if (!resPut.ok) throw new Error("Fallo al aplicar abono: " + resPut.statusText);
    const updatedClient = await resPut.json();
    console.log("¡Éxito! Titular con abono registrado satisfactoriamente. Deuda restante:", updatedClient.restante_por_pagar);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
