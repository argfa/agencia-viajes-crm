const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const newClient = await prisma.clientRecord.create({
    data: {
      destino: "Los Roques",
      fecha_salida: new Date("2026-12-01T08:00:00Z"),
      fecha_retorno: new Date("2026-12-05T18:00:00Z"),
      nombre: "Carmen",
      apellido: "Rojas",
      cedula: "11222333",
      edad: 45,
      monto_total: 1000,
      reserva_inicial: 300,
      abonos: 200,
      restante_por_pagar: 500, // 1000 Monto - 300 Reserva - 200 Abonos = 500
      metodo_pago: "Efectivo",
      vendedor: "Sistema Backend",
      cantidad_pax: 1,
      receipts: {
        create: [
          { type: "CONTRATO", monto_involucrado: 300 },
          { type: "ABONO", monto_involucrado: 200 }
        ]
      }
    }
  });

  console.log("¡Éxito! Cliente creado satisfactoriamente simulando una reserva con abono:", newClient.nombre, newClient.apellido);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
