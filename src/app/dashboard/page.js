'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AgenciaApp() {
  // Control estricto de navegación y Sesión
  useEffect(() => {
    // 1. Trampa de historial para interceptar el botón Atrás
    window.history.pushState({ page: 'dashboard_trap' }, '');

    const handlePopState = async (e) => {
      const confirmLogout = window.confirm("¿Seguro que deseas salir? Esto cerrará tu sesión.");
      if (confirmLogout) {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } else {
        // Redirigir la trampa hacia adelante si el usuario canceló
        window.history.pushState({ page: 'dashboard_trap' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Anti-BFCache para el botón Adelante (Navegación Fantasma)
    const handlePageShow = (e) => {
      // Si el navegador intentó restaurar la vista desde la memoria caché, forzamos recarga
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const [clients, setClients] = useState([])
  const [filterDestino, setFilterDestino] = useState('Todos')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [destinosUnicos, setDestinosUnicos] = useState([])
  
  const [destinos, setDestinos] = useState([])
  const [showDestinosModal, setShowDestinosModal] = useState(false)
  const [nuevoDestinoName, setNuevoDestinoName] = useState('')
  const [editadoDestinoId, setEditadoDestinoId] = useState(null)
  const [acompanantesList, setAcompanantesList] = useState([])
  const [isPagoCompleto, setIsPagoCompleto] = useState(false)
  const [searchCedula, setSearchCedula] = useState('')
  const [showAbonoModal, setShowAbonoModal] = useState(false)
  const [selectedClientForAbono, setSelectedClientForAbono] = useState(null)
  const [nuevoAbonoAmount, setNuevoAbonoAmount] = useState('')
  
  const [successReceipt, setSuccessReceipt] = useState(null)
  const [showAcompanantesModal, setShowAcompanantesModal] = useState(false)
  const [selectedClientAcompanantes, setSelectedClientAcompanantes] = useState(null)
  
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 25
  
  const [formData, setFormData] = useState({
    destino: '',
    fecha_salida: '',
    fecha_retorno: '',
    nombre: '',
    apellido: '',
    cedula: '',
    edad: '',
    cantidad_pax: '1',
    monto_total: '',
    reserva_inicial: '',
    abonos: '',
    restante_por_pagar: '',
    metodo_pago: 'Efectivo',
    vendedor: ''
  })
  
  const [warningMessage, setWarningMessage] = useState('')
  const [showWarning, setShowWarning] = useState(false)

  const fetchDestinos = async () => {
    try {
      const res = await fetch('/api/destinos')
      let dat = await res.json()
      
      if (!Array.isArray(dat)) {
        console.error('API returned non-array data for destinos:', dat)
        setDestinos([])
        return
      }

      // Auto seed if empty
      if (dat.length === 0) {
        const defaultList = [
          'Los Roques', 'Isla de Margarita', 'Morrocoy', 'Coché', 'Canaima', 
          'Mérida', 'Mochima', 'Choroní', 'Ocumare', 'Colonia Tovar', 
          'Punta la Cruz', 'Caripe', 'Otro'
        ]
        await fetch('/api/destinos', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ action: 'seed', name: defaultList })
        })
        const res2 = await fetch('/api/destinos')
        dat = await res2.json()
        if (!Array.isArray(dat)) dat = []
      }
      
      setDestinos(dat)
      
      setFormData(prev => {
        if (!prev.destino && dat.length > 0) return { ...prev, destino: dat[0].name }
        return prev
      })
    } catch (e) {
      console.error('Error fetching destinations:', e)
      setDestinos([])
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (!Array.isArray(data)) {
        console.error('API returned non-array data:', data)
        setClients([])
        setDestinosUnicos([])
        return
      }
      setClients(data)
      const unicos = [...new Set(data.map(c => c.destino))]
      setDestinosUnicos(unicos)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchDestinos()
    fetchClients()
  }, [])

  useEffect(() => {
    const pax = parseInt(formData.cantidad_pax) || 1
    const extraPax = Math.max(0, pax - 1)
    setAcompanantesList(prev => {
      if (prev.length === extraPax) return prev
      if (prev.length < extraPax) {
        const added = Array.from({length: extraPax - prev.length}, () => ({ nombre: '', apellido: '', cedula: '', edad: '', isMenor: false }))
        return [...prev, ...added]
      }
      return prev.slice(0, extraPax)
    })
  }, [formData.cantidad_pax])

  const handleAcompananteChange = (index, field, value) => {
    setAcompanantesList(prev => {
      const newList = [...prev]
      newList[index] = { ...newList[index], [field]: value }
      return newList
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      if (['monto_total', 'reserva_inicial', 'abonos', 'restante_por_pagar'].includes(name)) {
        const total = parseFloat(newData.monto_total) || 0
        const reserva = parseFloat(newData.reserva_inicial) || 0
        const abonos = parseFloat(newData.abonos) || 0
        const calculado = total - reserva - abonos
        const manual = parseFloat(newData.restante_por_pagar)

        if (newData.restante_por_pagar !== '' && Math.abs(manual - calculado) > 0.01) {
          setWarningMessage(`⚠️ Atención: El restante lógico debería ser ${calculado}, pero ingresaste ${manual}.`)
          setShowWarning(true)
        } else {
          setShowWarning(false)
        }
      }
      
      return newData
    })
  }

  // Formato de máscara manual eliminado (usando native datetime-local)

  const handleIgnoreWarning = () => setShowWarning(false)
  const handleAutoFix = () => {
    const total = parseFloat(formData.monto_total) || 0
    const reserva = parseFloat(formData.reserva_inicial) || 0
    const abonos = parseFloat(formData.abonos) || 0
    const calculado = total - reserva - abonos
    setFormData(prev => ({...prev, restante_por_pagar: calculado.toString()}))
    setShowWarning(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (showWarning) {
      const confirmar = window.confirm("Hay una advertencia sobre el monto restante. ¿Deseas guardarlo de todos modos?")
      if (!confirmar) return;
    }



    try {
      const formDataToSend = { ...formData }
      if (isPagoCompleto) {
        formDataToSend.reserva_inicial = formData.monto_total || 0;
        formDataToSend.abonos = 0;
        formDataToSend.restante_por_pagar = 0;
      }

      const acompanantesFormatted = acompanantesList.map((a, idx) => {
        const n = a.nombre.trim().split(/\s+/)[0] || '';
        const ap = a.apellido.trim().split(/\s+/)[0] || '';
        let ced = a.cedula.trim() || '';
        if (a.isMenor) {
          ced = `${formDataToSend.cedula || 'TITULAR'}-MENOR-${idx + 1}`;
        }
        if (!n && !ap && !ced) return '';
        return `${n} ${ap} ${ced ? '('+ced+')' : ''} [${a.edad ? a.edad + ' AÑOS' : 'S/E'}]`.trim();
      }).filter(str => str !== '').join(' | ');

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formDataToSend,
          monto_total: parseFloat(formDataToSend.monto_total) || 0,
          reserva_inicial: parseFloat(formDataToSend.reserva_inicial) || 0,
          abonos: parseFloat(formDataToSend.abonos) || 0,
          restante_por_pagar: parseFloat(formDataToSend.restante_por_pagar) || 0,
          acompanantes: acompanantesFormatted
        })
      })
      if (res.ok) {
        const savedClient = await res.json()
        const pdfUrl = await generateReceiptPDF(savedClient, 'CONTRATO', isPagoCompleto ? parseFloat(formData.monto_total) : parseFloat(formData.reserva_inicial))
        
        setAcompanantesList([])
        setIsPagoCompleto(false)
        setFormData({
            destino: destinos.length > 0 ? destinos[0].name : '', 
            fecha_salida: '', fecha_retorno: '', nombre: '', apellido: '', cedula: '', edad: '',
            cantidad_pax: '1',
            monto_total: '', reserva_inicial: '', abonos: '', restante_por_pagar: '',
            metodo_pago: 'Efectivo', vendedor: ''
        })
        fetchClients()
        setShowWarning(false)
        setSuccessReceipt({ url: pdfUrl, message: 'Reserva guardada exitosamente' })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchDestino = filterDestino === 'Todos' || c.destino === filterDestino;
    const matchCedula = searchCedula === '' || c.cedula.includes(searchCedula) || (c.acompanantes && c.acompanantes.includes(searchCedula));
    const matchStatus = filterStatus === 'Todos' || (filterStatus === 'Pagado' ? c.restante_por_pagar === 0 : c.restante_por_pagar > 0);
    return matchDestino && matchCedula && matchStatus;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'fecha_salida') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortConfig.key === 'status') {
      aVal = a.restante_por_pagar === 0 ? 0 : 1;
      bVal = b.restante_por_pagar === 0 ? 0 : 1;
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => { setCurrentPage(1) }, [filterDestino, searchCedula]);

  const paginatedClients = sortedClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(sortedClients.length / ITEMS_PER_PAGE);

  const exportExcel = () => {
    if (sortedClients.length === 0) return alert('No hay registros para exportar.');
    const exportData = sortedClients.map(c => ({
      "Destino": c.destino,
      "Fecha": new Date(c.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      "Nombre Titular": c.nombre,
      "Apellido Titular": c.apellido,
      "Cédula Titular": c.cedula,
      "Cantidad PAX": c.cantidad_pax || 1,
      "Acompañantes": c.acompanantes || 'N/A',
      "Monto Total ($)": c.monto_total,
      "Reserva Inicial ($)": c.reserva_inicial,
      "Abonos ($)": c.abonos,
      "Restante ($)": c.restante_por_pagar,
      "Status": c.restante_por_pagar === 0 ? "PAGADO" : "PENDIENTE",
      "Método de Pago": c.metodo_pago,
      "Vendedor": c.vendedor
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes")
    XLSX.writeFile(workbook, `Ventas_${filterDestino}.xlsx`)
  }

  const exportPDF = () => {
    if (sortedClients.length === 0) return alert('No hay registros para exportar.');
    const doc = new jsPDF('landscape')
    
    const brandColor = [0, 119, 182]
    
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2])
    doc.rect(0, 0, 300, 20, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("AGENCIA DE VIAJES BEACH CAMP", 14, 13)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const fechaReporte = new Date().toLocaleString('es-VE')
    doc.text(`Generado: ${fechaReporte}`, 280, 13, { align: 'right' })
    
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`Reporte Comercial - Destino: ${filterDestino}`, 14, 30)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Total de registros: ${sortedClients.length}`, 14, 36)

    const tableColumn = ["Destino", "Fecha", "Titular", "Cédula", "PAX", "Acompañantes", "T. Contratado", "T. Pagado", "Deuda"]
    const tableRows = []
    
    let sumTotal = 0
    let sumCobrado = 0
    let sumDeuda = 0

    sortedClients.forEach(c => {
      const cobrado = (c.reserva_inicial || 0) + (c.abonos || 0)
      sumTotal += c.monto_total || 0
      sumCobrado += cobrado
      sumDeuda += c.restante_por_pagar || 0
      
      const clientData = [
        c.destino, 
        new Date(c.fecha).toLocaleDateString('es-VE'), 
        `${c.nombre} ${c.apellido}`, 
        c.cedula, 
        c.cantidad_pax || 1,
        c.acompanantes ? c.acompanantes.split(' | ').join('\n') : '-',
        `$${(c.monto_total || 0).toFixed(2)}`, 
        `$${cobrado.toFixed(2)}`,
        `$${(c.restante_por_pagar || 0).toFixed(2)}`
      ]
      tableRows.push(clientData)
    })

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: brandColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: {
        5: { cellWidth: 80, fontSize: 7, cellPadding: { top: 2, right: 2, bottom: 2, left: 2 } },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold', textColor: [208, 0, 0] }
      }
    })

    let finalY = doc.lastAutoTable.finalY || 42
    
    if (finalY + 40 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage()
      finalY = 20
    }
    
    doc.setFillColor(245, 245, 245)
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2])
    doc.setLineWidth(0.5)
    doc.rect(14, finalY + 10, 90, 26, 'FD')
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2])
    doc.text("RESUMEN FINANCIERO", 18, finalY + 16)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(9)
    doc.text(`Proyección Total Bruta: $${sumTotal.toFixed(2)}`, 18, finalY + 22)
    doc.text(`Ingresos Reales Cobrados: $${sumCobrado.toFixed(2)}`, 18, finalY + 28)
    doc.setFont("helvetica", "bold")
    doc.text(`Cuentas por Cobrar: $${sumDeuda.toFixed(2)}`, 18, finalY + 34)
    
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Página ${i} de ${pageCount}`, 280, 200, { align: 'right' })
    }

    const pdfUrl = doc.output('bloburl')
    window.open(pdfUrl, '_blank')
  }

  const generateReceiptPDF = async (clientData, type, amount) => {
    amount = parseFloat(amount) || 0;
    const doc = new jsPDF()

    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const r0 = data[0], g0 = data[1], b0 = data[2];
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            // Tolerancia para clareo de imagen (remover fondo claro artificial)
            if (Math.abs(r - r0) < 30 && Math.abs(g - g0) < 30 && Math.abs(b - b0) < 30) {
              data[i+3] = 0; 
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(img); // Fallback si hay cors issues
        }
      };
      img.onerror = (e) => reject(e);
    });
    
    let logoImg;
    try {
      logoImg = await loadImage('/logo.png');
    } catch (e) {
      console.warn("Logo no encontrado", e);
    }

    if (type === 'CONTRATO') {
      doc.setFillColor(235, 235, 235);
      doc.rect(0, 0, 210, 297, 'F');

      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 85, 4, 40, 40)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.text("Rif: J-407551825", 105, 43, { align: 'center' })
      }
      
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text("Agencia de Viajes Beach Camp", 105, 50, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text("RECIBO DE CONTRATO DE SERVICIO TURÍSTICO", 105, 58, { align: 'center' })
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-VE')}`, 14, 75)
      doc.text(`Cédula Titular: V-${clientData.cedula}   |   Edad: ${clientData.edad || 'N/A'} años`, 14, 82)
      doc.text(`Nombre Titular: ${clientData.nombre} ${clientData.apellido}`, 14, 89)
      doc.text(`Destino: ${clientData.destino}`, 14, 96)
      
      const finalSalida = clientData.fecha_salida || clientData.fecha || new Date();
      const finalRetorno = clientData.fecha_retorno || clientData.fecha || new Date();
      
      const fSalidaStr = new Date(finalSalida).toLocaleString('es-VE', {dateStyle:'short', timeStyle:'short', hour12:true});
      const fRetornoStr = new Date(finalRetorno).toLocaleString('es-VE', {dateStyle:'short', timeStyle:'short', hour12:true});
      
      doc.setLineWidth(0.5)
      doc.line(14, 100, 196, 100)
      doc.text(`Itinerario: Salida el ${fSalidaStr}   |   Retorno el ${fRetornoStr}`, 14, 106)
      doc.line(14, 109, 196, 109)

      const paxCount = clientData.cantidad_pax || 1;
      
      const textoLegal = `Los suscritos, ciudadano Yohan Ernesto Quintero García, de nacionalidad venezolana identificado con su cedula de identidad N° 22.812.760 director del servicio de turismo Beach Camp. C.A. y el (la) ${clientData.nombre} ${clientData.apellido}, V-${clientData.cedula} (Edad: ${clientData.edad || 'N/A'} años) nacionalidad VENEZOLANA postulante a ser participante del itinerario hacia ${clientData.destino} con salida programada para el ${fSalidaStr} y retorno el ${fRetornoStr}, asume el compromiso adquirido que se detalla a continuación:`;
      
      const finalLines = doc.splitTextToSize(textoLegal, 180);
      doc.text(finalLines, 14, 116)

      let bulletY = 116 + (finalLines.length * 5) + 5;
      doc.text("• Respetar los horarios establecidos paraca actividad,ante y durante el viaje.", 18, bulletY)
      doc.text("• Cancelar el restante del paquete ofrecido a la fecha indicada.", 18, bulletY + 6)
      doc.text("• Cumplir los lineamientos y normas establecidas por los organizadores del viaje.", 18, bulletY + 12)

      const textoReembolso = `En caso de no poder viajar en la fecha correspondiente la reservación no es reembolsable y si llegase a tener algún abono aparte de la reservación se mantendrá para un próximo viaje. Por incumplimiento, Servicio de Viajes y Turismo Beach Camp Mochima queda liberado de realizar cualquier tipo de reembolso o devolución de dinero, y podrá sancionar con ayuda de organismos de seguridad de entes públicos a los implicados según la gravedad de la falta.`;
      const reembolsoLines = doc.splitTextToSize(textoReembolso, 180);
      
      let nextY = bulletY + 25;
      doc.text(reembolsoLines, 14, nextY)
      
      nextY += (reembolsoLines.length * 5) + 8;
      doc.text(`Se suscribe la presente acta compromiso en la Ciudad de San Félix ${new Date().toLocaleDateString('es-VE')}`, 14, nextY)
      nextY += 8;

      doc.text("Participantes al viaje programado arriba mencionado:", 14, nextY)
      nextY += 8;
      
      doc.setFont("helvetica", "normal")
      const acompanantesL = clientData.acompanantes ? clientData.acompanantes.split(' | ') : [];
      let totalPaxList = [`1-${clientData.nombre} ${clientData.apellido} V-${clientData.cedula} [Edad: ${clientData.edad || 'N/A'}]`];
      acompanantesL.forEach((ac, idx) => totalPaxList.push(`${idx+2}-${ac}`));

      totalPaxList.forEach((line, index) => {
         doc.text(line, 14, nextY + (index * 6));
      });

      doc.addPage();
    } 

    doc.setFillColor(220, 220, 220)
    doc.rect(0, 0, 210, 297, 'F') 
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(`RECIBO DE ${type}`, 105, 22, { align: 'center' })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-VE', {dateStyle:'short', timeStyle:'short', hour12:true})}`, 105, 28, { align: 'center' })

    doc.setFont("helvetica", "italic")
    doc.setFont("helvetica", "bolditalic")
    doc.setFontSize(28)
    doc.text("¡Piensa menos", 18, 75)
    doc.text("viaja más!", 25, 87)

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 155, 15, 38, 38)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(7)
      doc.text("Rif: J-407551825", 174, 52, { align: 'center' })
    }

    const boxY = 120;
    
    doc.setDrawColor(120, 120, 120)
    doc.setLineWidth(0.8)
    doc.line(10, boxY, 200, boxY)       
    doc.line(10, boxY + 25, 200, boxY + 25) 
    doc.line(75, boxY, 75, boxY + 110)         

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(`${clientData.nombre} ${clientData.apellido}, V-${clientData.cedula} [Edad: ${clientData.edad || 'N/A'}]`, 12, boxY + 10)
    
    doc.setFontSize(14)
    doc.text("Pagado a:", 90, boxY + 10)
    doc.text("Beach Camp Mochima, C.A.", 90, boxY + 18)

    doc.setFontSize(12)
    doc.text("Descripción", 18, boxY + 35)
    doc.setFont("helvetica", "bold")
    doc.text("CANTIDAD", 160, boxY + 35)

    doc.line(10, boxY + 42, 200, boxY + 42)

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    const notasDesc = `Nota: Reservación de ${(clientData.cantidad_pax || 1).toString().padStart(2, '0')} cupos ${clientData.destino}`
    const noteLines = doc.splitTextToSize(notasDesc, 60)
    doc.text(noteLines, 12, boxY + 50)

    let yPax = boxY + 50 + (noteLines.length * 5);
    
    const acompanantesL = clientData.acompanantes ? clientData.acompanantes.split(' | ') : [];
    let totalPaxList2 = [`1-${clientData.nombre} ${clientData.apellido} V-${clientData.cedula} [Edad: ${clientData.edad || 'N/A'}]`];
    acompanantesL.forEach((ac, idx) => totalPaxList2.push(`${idx+2}-${ac}`));

    totalPaxList2.forEach((line, index) => {
       const pLine = doc.splitTextToSize(line, 60);
       doc.text(pLine, 12, yPax);
       yPax += pLine.length * 5;
    });

    const valY = boxY + 60;
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL PAQUETE", 105, valY)
    doc.setFont("helvetica", "normal")
    doc.text(`$${clientData.monto_total.toFixed(2)}`, 170, valY)

    doc.setFont("helvetica", "bold")
    doc.text("Abono", 115, valY + 15)
    doc.setFont("helvetica", "normal")
    doc.text(`$${amount.toFixed(2)}`, 170, valY + 15)

    doc.setFont("helvetica", "bold")
    doc.text("Resta", 115, valY + 30)
    doc.setFont("helvetica", "normal")
    doc.text(`$${clientData.restante_por_pagar.toFixed(2)}`, 170, valY + 30)

    doc.setFont("helvetica", "bold")
    doc.text("subTotal", 115, valY + 45)
    
    doc.text("TOTAL", 115, valY + 55)
    doc.setFont("helvetica", "normal")
    doc.text(`$${clientData.monto_total.toFixed(2)}`, 170, valY + 55)

    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Recibido por: Beach Camp", 90, boxY + 130)

    return doc.output('bloburl')
  }

  const printReceipt = async (client) => {
    const pdfUrl = await generateReceiptPDF(client, 'CONTRATO', client.reserva_inicial || client.monto_total);
    setSuccessReceipt({ url: pdfUrl, message: 'Copia de recibo generada' });
  }

  const openAbonoModal = (client) => {
    setSelectedClientForAbono(client)
    setNuevoAbonoAmount('')
    setShowAbonoModal(true)
  }
  
  const submitAbono = async (e) => {
    e.preventDefault()
    if (!selectedClientForAbono || !nuevoAbonoAmount) return
    
    const amount = parseFloat(nuevoAbonoAmount)
    if (amount <= 0 || amount > selectedClientForAbono.restante_por_pagar) {
      alert('Monto inválido. No puede ser mayor a la deuda actual.')
      return
    }
    
    const newAbonos = selectedClientForAbono.abonos + amount
    const newRestante = selectedClientForAbono.restante_por_pagar - amount
    
    const res = await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedClientForAbono.id,
        abonos: newAbonos,
        restante_por_pagar: newRestante,
        monto_involucrado: amount
      })
    })
    
    if (res.ok) {
      const updatedClient = await res.json()
      const pdfUrl = await generateReceiptPDF(updatedClient, 'ABONO', amount)
      setShowAbonoModal(false)
      setSelectedClientForAbono(null)
      fetchClients()
      setSuccessReceipt({ url: pdfUrl, message: 'Abono registrado exitosamente' })
    } else {
      alert('Error registrando abono')
    }
  }

  // --- Destinos Management ---
  const saveDestino = async (e) => {
    e.preventDefault()
    if (!nuevoDestinoName) return

    const res = await fetch('/api/destinos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: editadoDestinoId ? 'update' : 'create',
        id: editadoDestinoId,
        name: nuevoDestinoName
      })
    })
    
    if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || 'Ocurrió un error')
        return
    }
    
    setNuevoDestinoName('')
    setEditadoDestinoId(null)
    fetchDestinos()
  }

  const editDestino = (d) => {
    setEditadoDestinoId(d.id)
    setNuevoDestinoName(d.name)
  }

  const deleteDestino = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este destino de la lista?")) return
    await fetch('/api/destinos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    fetchDestinos()
  }

  const isFormValid = 
    formData.destino.trim() !== '' &&
    formData.fecha_salida !== '' &&
    formData.fecha_retorno !== '' &&
    new Date(formData.fecha_retorno) > new Date(formData.fecha_salida) &&
    formData.nombre.trim() !== '' &&
    formData.apellido.trim() !== '' &&
    formData.cedula.trim() !== '' &&
    parseInt(formData.cantidad_pax) >= 1 &&
    formData.vendedor.trim() !== '' &&
    !isNaN(parseFloat(formData.monto_total)) && parseFloat(formData.monto_total) > 0 &&
    (isPagoCompleto || (!isNaN(parseFloat(formData.reserva_inicial)) && parseFloat(formData.reserva_inicial) >= 0 && !isNaN(parseFloat(formData.restante_por_pagar)) && parseFloat(formData.restante_por_pagar) >= 0)) &&
    (parseInt(formData.cantidad_pax) <= 1 || acompanantesList.every(ac => ac.nombre.trim() !== '' && ac.apellido.trim() !== '' && (!ac.isMenor || (ac.edad.trim() !== '' && parseInt(ac.edad) >= 0)) && (ac.isMenor || (ac.cedula && ac.cedula.trim() !== ''))));

  const todayLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);

  return (
    <>
      <div style={{display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem'}}>
        <button 
          onClick={async () => { await fetch('/api/auth/logout', {method:'POST'}); window.location.href='/'; }} 
          className="btn btn-secondary" 
          style={{background:'linear-gradient(135deg, #e63946, #d00000)', color: 'white', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 10px rgba(230, 57, 70, 0.4)', zIndex: 1000}}>
          Cerrar Sesión
        </button>
      </div>

      <div className="glass-card">
        <h2 style={{marginBottom: '1rem', color: 'var(--primary)'}}>📍 Nueva Reserva</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="input-group">
              <label>Destino</label>
              <div style={{display:'flex', gap:'0.5rem'}}>
                <select name="destino" required value={formData.destino} onChange={handleChange} style={{flex: 1}}>
                  {destinos.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {destinos.length === 0 && <option value="">Cargando...</option>}
                </select>
                <button type="button" onClick={() => setShowDestinosModal(true)} className="btn btn-secondary" style={{padding:'0 0.5rem'}} title="Ajustar ubicaciones">✏️</button>
              </div>
            </div>
            
            <div className="input-group">
              <label>Fecha y Hora de Salida</label>
              <input name="fecha_salida" type="datetime-local" min={todayLocal} required value={formData.fecha_salida} onChange={handleChange}/>
            </div>
            <div className="input-group">
              <label>Fecha y Hora de Retorno</label>
              <input name="fecha_retorno" type="datetime-local" min={formData.fecha_salida || todayLocal} required value={formData.fecha_retorno} onChange={handleChange}/>
            </div>
            <div className="input-group">
              <label>Nombre</label>
              <input name="nombre" type="text" required value={formData.nombre} onChange={handleChange}/>
            </div>
            <div className="input-group">
              <label>Apellido</label>
              <input name="apellido" type="text" required value={formData.apellido} onChange={handleChange}/>
            </div>
            <div className="input-group">
              <label>Cédula/ID</label>
              <input name="cedula" type="text" required value={formData.cedula} onChange={e => handleChange({ target: { name: 'cedula', value: e.target.value.replace(/\D/g, '') }})}/>
            </div>
            <div className="input-group">
              <label>Cantidad de Personas (PAX)</label>
              <input name="cantidad_pax" type="number" min="1" required value={formData.cantidad_pax} onChange={handleChange}/>
            </div>
            <div className="input-group">
              <label>Vendedor</label>
              <input name="vendedor" type="text" required value={formData.vendedor} onChange={handleChange}/>
            </div>
            {parseInt(formData.cantidad_pax) > 1 && (
              <div style={{gridColumn: '1 / -1', marginTop: '0.5rem', background: 'rgba(255,255,255,0.3)', padding: '1rem', borderRadius: '12px'}}>
                <h4 style={{marginBottom: '1rem', color: 'var(--primary)'}}>👥 Datos de Acompañantes</h4>
                {acompanantesList.map((acomp, idx) => (
                  <div key={idx} style={{display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap'}}>
                    <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                      <label style={{fontSize: '0.85rem'}}>Nombre ({idx + 1})</label>
                      <input type="text" value={acomp.nombre} onChange={e => handleAcompananteChange(idx, 'nombre', e.target.value)} style={{padding: '0.4rem'}} placeholder="Ej. Juan"/>
                    </div>
                    <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                      <label style={{fontSize: '0.85rem'}}>Apellido ({idx + 1})</label>
                      <input type="text" value={acomp.apellido} onChange={e => handleAcompananteChange(idx, 'apellido', e.target.value)} style={{padding: '0.4rem'}} placeholder="Ej. Perez"/>
                    </div>
                    <div className="input-group" style={{flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label style={{fontSize: '0.85rem'}}>Cédula ({idx + 1})</label>
                        <label style={{fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
                          <input type="checkbox" checked={acomp.isMenor} onChange={e => handleAcompananteChange(idx, 'isMenor', e.target.checked)} />
                          Menor/Sin Cédula
                        </label>
                      </div>
                      <input type="text" value={acomp.isMenor ? 'MENOR' : acomp.cedula} disabled={acomp.isMenor} onChange={e => handleAcompananteChange(idx, 'cedula', e.target.value.replace(/\D/g, ''))} style={{padding: '0.4rem'}} placeholder="Ej. 12345678"/>
                    </div>
                    <div className="input-group" style={{flex: 1, minWidth: '80px', maxWidth: '100px'}}>
                      <label style={{fontSize: '0.85rem'}}>Edad</label>
                      <input type="number" min="0" required={acomp.isMenor} value={acomp.edad} onChange={e => handleAcompananteChange(idx, 'edad', e.target.value)} style={{padding: '0.4rem'}} placeholder="Años"/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <h3 style={{margin: '1.5rem 0 1rem', color: 'var(--primary)'}}>💳 Pagos</h3>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontWeight:'bold', color:'var(--text)'}}>
              <input type="checkbox" checked={isPagoCompleto} onChange={(e) => setIsPagoCompleto(e.target.checked)} style={{width:'20px', height:'20px'}}/>
               Facturar como Pago Completo (Cancelación Total)
            </label>
          </div>
          <div className="form-grid">
            <div className="input-group">
              <label>Monto Total ($)</label>
              <input name="monto_total" type="number" step="0.01" required value={formData.monto_total} onChange={handleChange}/>
            </div>
            {!isPagoCompleto && (
              <>
                <div className="input-group">
                  <label>Reserva Inicial ($)</label>
                  <input name="reserva_inicial" type="number" step="0.01" required value={formData.reserva_inicial} onChange={handleChange}/>
                </div>
                <div className="input-group">
                  <label>Abonos Previos ($) (Opcional)</label>
                  <input name="abonos" type="number" step="0.01" value={formData.abonos} onChange={handleChange} placeholder="0"/>
                </div>
                <div className="input-group">
                  <label>Restante por Pagar (Manual) ($)</label>
                  <input name="restante_por_pagar" type="number" step="0.01" value={formData.restante_por_pagar} onChange={handleChange} placeholder="Autocalculable"/>
                </div>
              </>
            )}
            <div className="input-group">
              <label>Método de Pago</label>
              <select name="metodo_pago" required value={formData.metodo_pago} onChange={handleChange}>
                <option>Efectivo</option>
                <option>Zelle</option>
                <option>Transferencia Local</option>
                <option>Pago Móvil</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          {showWarning && (
            <div className="alert">
              <span>{warningMessage}</span>
              <div className="alert-actions">
                <button type="button" className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.9rem'}} onClick={handleAutoFix}>Autocorregir</button>
                <button type="button" className="btn btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.9rem', background: '#d00000'}} onClick={handleIgnoreWarning}>Ignorar</button>
              </div>
            </div>
          )}

          <div style={{marginTop: '2rem', textAlign: 'right'}}>
            <button type="submit" className="btn btn-primary" disabled={!isFormValid} style={{ opacity: isFormValid ? 1 : 0.5, cursor: isFormValid ? 'pointer' : 'not-allowed', background: isFormValid ? 'var(--primary)' : '#95a5a6' }}>Guardar Registro</button>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap:'wrap', gap:'1rem'}}>
          <h2 style={{color: 'var(--primary)'}}>🗂️ Registro de Viajeros</h2>
          
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
            <label style={{fontWeight: 'bold', color: 'var(--text)'}}>Buscar Cédula:</label>
            <input 
              type="text" 
              value={searchCedula} 
              onChange={(e) => setSearchCedula(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 123456"
              style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid #90e0ef', outline: 'none'}}
            />
            
            <label style={{fontWeight: 'bold', color: 'var(--text)'}}>Destino:</label>
            <select 
              value={filterDestino} 
              onChange={(e) => setFilterDestino(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid #90e0ef', outline: 'none', marginRight: '0.5rem'}}
            >
              <option value="Todos">Todos</option>
              {destinosUnicos.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label style={{fontWeight: 'bold', color: 'var(--text)'}}>Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid #90e0ef', outline: 'none'}}
            >
              <option value="Todos">Todos</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
        </div>

        <div style={{marginBottom: '1rem', display: 'flex', gap: '1rem'}}>
          <button 
            onClick={exportExcel} 
            className="btn btn-secondary" 
            style={{background: sortedClients.length === 0 ? '#95a5a6' : 'linear-gradient(135deg, #40916c, #1b4332)', cursor: sortedClients.length === 0 ? 'not-allowed' : 'pointer', opacity: sortedClients.length === 0 ? 0.6 : 1, border: 'none', boxShadow: '0 4px 10px rgba(45, 106, 79, 0.3)'}}
            disabled={sortedClients.length === 0}
          >
            📊 Exportar Excel
          </button>
          <button 
            onClick={exportPDF} 
            className="btn btn-secondary" 
            style={{background: sortedClients.length === 0 ? '#95a5a6' : 'linear-gradient(135deg, #e63946, #9b2226)', cursor: sortedClients.length === 0 ? 'not-allowed' : 'pointer', opacity: sortedClients.length === 0 ? 0.6 : 1, border: 'none', boxShadow: '0 4px 10px rgba(208, 0, 0, 0.3)'}}
            disabled={sortedClients.length === 0}
          >
            📄 Exportar PDF
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('destino')} style={{cursor: 'pointer'}}>Destino {sortConfig.key === 'destino' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th onClick={() => handleSort('fecha_salida')} style={{cursor: 'pointer'}}>Itinerario {sortConfig.key === 'fecha_salida' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th onClick={() => handleSort('nombre')} style={{cursor: 'pointer'}}>Titular {sortConfig.key === 'nombre' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th onClick={() => handleSort('cedula')} style={{cursor: 'pointer'}}>Cédula {sortConfig.key === 'cedula' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th>PAX</th>
                <th>Total ($)</th>
                <th>Pagado ($)</th>
                <th>Deuda ($)</th>
                <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay registros disponibles.</td>
                </tr>
              ) : (
                paginatedClients.map(c => {
                  const pagado = c.reserva_inicial + c.abonos;
                  return (
                    <tr key={c.id}>
                      <td>{c.destino}</td>
                      <td style={{fontSize: '0.85rem'}}>
                        <strong style={{color:'var(--primary)'}}>Salida:</strong><br/>{new Date(c.fecha_salida).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short', hour12: true })}<br/>
                        <strong style={{color:'var(--primary)'}}>Retorno:</strong><br/>{new Date(c.fecha_retorno).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short', hour12: true })}
                      </td>
                      <td>
                        {c.nombre} {c.apellido}
                        <div style={{marginTop: '0.4rem'}}>
                          <button onClick={() => printReceipt(c)} className="btn btn-secondary" style={{padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: 'var(--primary)'}} title="Imprimir Contrato Original">📄 Imprimir</button>
                        </div>
                      </td>
                      <td>V-{c.cedula}</td>
                      <td>
                        {c.cantidad_pax || 1}
                        {(c.cantidad_pax > 1 && c.acompanantes) && (
                          <button onClick={() => { setSelectedClientAcompanantes(c); setShowAcompanantesModal(true); }} className="btn btn-secondary" style={{marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}>Ver 👥</button>
                        )}
                      </td>
                      <td>{c.monto_total}</td>
                      <td>{pagado}</td>
                      <td><strong>{c.restante_por_pagar}</strong></td>
                      <td style={{color: c.restante_por_pagar === 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold'}}>
                        {c.restante_por_pagar === 0 ? 'PAGADO' : 'PENDIENTE'}
                        {c.restante_por_pagar > 0 && (
                          <button onClick={() => openAbonoModal(c)} className="btn btn-secondary" style={{marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}>Abonar</button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 1rem'}}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="btn btn-secondary" style={{padding: '0.4rem 1rem'}}>Anterior</button>
            <span style={{color: 'var(--text)', fontWeight: 'bold'}}>Página {currentPage} de {totalPages || 1} <span style={{fontWeight: 'normal', fontSize: '0.9rem'}}>(Total: {sortedClients.length} registros)</span></span>
            <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="btn btn-secondary" style={{padding: '0.4rem 1rem'}}>Siguiente</button>
          </div>
        )}
      </div>

      {showAbonoModal && selectedClientForAbono && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, 
          background: 'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{width: '90%', maxWidth: '400px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
              <h3>Abonar Deuda</h3>
              <button type="button" onClick={() => setShowAbonoModal(false)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.5rem'}}>✖</button>
            </div>
            
            <p><strong>Cliente:</strong> {selectedClientForAbono.nombre} {selectedClientForAbono.apellido}</p>
            <p><strong>Deuda Actual:</strong> ${selectedClientForAbono.restante_por_pagar}</p>
            
            <form onSubmit={submitAbono} style={{marginTop: '1rem'}}>
              <div className="input-group">
                <label>Monto a Abonar ($)</label>
                <input type="number" step="0.01" max={selectedClientForAbono.restante_por_pagar} required value={nuevoAbonoAmount} onChange={e => setNuevoAbonoAmount(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}}>Generar Recibo de Abono</button>
            </form>
          </div>
        </div>
      )}
      
      {successReceipt && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, 
          background: 'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{width: '90%', maxWidth: '400px', textAlign: 'center'}}>
            <h3 style={{color: 'var(--success)', marginBottom: '1rem'}}>✅ {successReceipt.message}</h3>
            <p style={{marginBottom: '1.5rem', color: 'var(--text)'}}>El recibo ha sido generado exitosamente.</p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <a href={successReceipt.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" onClick={() => setSuccessReceipt(null)} style={{textDecoration: 'none'}}>📄 Ver Recibo</a>
              <button onClick={() => setSuccessReceipt(null)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showAcompanantesModal && selectedClientAcompanantes && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, 
          background: 'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{width: '90%', maxWidth: '500px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
              <h3>👥 Lista de Acompañantes</h3>
              <button type="button" onClick={() => setShowAcompanantesModal(false)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.5rem'}}>✖</button>
            </div>
            <p><strong>Titular:</strong> {selectedClientAcompanantes.nombre} {selectedClientAcompanantes.apellido}</p>
            <ul style={{listStyle: 'none', padding: 0, marginTop: '1rem'}}>
              {selectedClientAcompanantes.acompanantes.split('|').map((acomp, i) => (
                <li key={i} style={{padding: '0.8rem', background: 'rgba(255,255,255,0.4)', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid rgba(0,0,0,0.1)'}}>
                  <strong style={{color: 'var(--primary)'}}>Pasajero #{i+2}:</strong> {acomp.trim()}
                </li>
              ))}
            </ul>
            <div style={{marginTop: '1.5rem', textAlign: 'right'}}>
              <button onClick={() => setShowAcompanantesModal(false)} className="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showDestinosModal && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, 
          background: 'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{width: '90%', maxWidth: '500px', maxHeight:'80vh', overflowY:'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
              <h3>Administrar Destinos</h3>
              <button onClick={() => { setShowDestinosModal(false); setEditadoDestinoId(null); setNuevoDestinoName(''); }} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.5rem'}}>✖</button>
            </div>
            
            <form onSubmit={saveDestino} style={{display:'flex', gap:'0.5rem', marginBottom:'1rem'}}>
              <input 
                type="text" 
                value={nuevoDestinoName} 
                onChange={e => setNuevoDestinoName(e.target.value)} 
                placeholder="Nombre del destino" 
                required 
                style={{flex:1, padding:'0.5rem', borderRadius:'8px', border:'1px solid #ccc'}}
              />
              <button type="submit" className="btn btn-primary" style={{padding:'0.5rem 1rem'}}>
                {editadoDestinoId ? 'Actualizar' : 'Agregar'}
              </button>
              {editadoDestinoId && <button type="button" onClick={() => {setEditadoDestinoId(null); setNuevoDestinoName('')}} className="btn btn-secondary" style={{padding:'0.5rem 1rem'}}>Cancelar</button>}
            </form>

            <ul style={{listStyle:'none', padding:0}}>
              {destinos.map(d => (
                <li key={d.id} style={{display:'flex', justifyContent:'space-between', padding:'0.5rem', borderBottom:'1px solid rgba(0,0,0,0.1)'}}>
                  <span>{d.name}</span>
                  <div>
                    <button type="button" onClick={() => editDestino(d)} style={{background:'none', border:'none', cursor:'pointer', marginRight:'0.5rem'}}>✏️</button>
                    <button type="button" onClick={() => deleteDestino(d.id)} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
