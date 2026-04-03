'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AgenciaApp() {
  const [clients, setClients] = useState([])
  const [filterDestino, setFilterDestino] = useState('Todos')
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
    fecha: '',
    nombre: '',
    apellido: '',
    cedula: '',
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
        const added = Array.from({length: extraPax - prev.length}, () => ({ nombre: '', apellido: '', cedula: '', isMenor: false }))
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

  const handleDateMaskDashboard = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length >= 5) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4) + '/' + val.substring(4, 8)
    } else if (val.length >= 3) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4)
    }
    setFormData(prev => ({...prev, fecha: val}))
  }

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

    if (formData.fecha.length !== 10) {
      alert('Recuerde que el formato de fecha debe ser estrictamente DD/MM/YYYY')
      return;
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
        return `${n} ${ap} ${ced ? '('+ced+')' : ''}`.trim();
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
        const pdfUrl = generateReceiptPDF(savedClient, 'CONTRATO', isPagoCompleto ? formData.monto_total : formData.reserva_inicial)
        
        setAcompanantesList([])
        setIsPagoCompleto(false)
        setFormData({
            destino: destinos.length > 0 ? destinos[0].name : '', 
            fecha: '', nombre: '', apellido: '', cedula: '',
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
    return matchDestino && matchCedula;
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
    
    if (sortConfig.key === 'fecha') {
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

  const generateReceiptPDF = (clientData, type, amount) => {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("Agencia de Viajes Beach Camp", 105, 20, { align: 'center' })
    
    doc.setFontSize(14)
    if (type === 'CONTRATO') {
      doc.text("RECIBO DE CONTRATO DE SERVICIO TURÍSTICO", 105, 30, { align: 'center' })
    } else {
      doc.text("RECIBO DE ABONO A DEUDA", 105, 30, { align: 'center' })
    }
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-VE')}`, 14, 45)
    doc.text(`Cédula Titular: ${clientData.cedula}`, 14, 52)
    doc.text(`Nombre Titular: ${clientData.nombre} ${clientData.apellido}`, 14, 59)
    doc.text(`Destino: ${clientData.destino} - Fecha del Viaje: ${new Date(clientData.fecha).toLocaleDateString('es-VE')}`, 14, 66)
    
    doc.setLineWidth(0.5)
    doc.line(14, 72, 196, 72)
    
    if (type === 'CONTRATO') {
      doc.text(`Cantidad de PAX: ${clientData.cantidad_pax || 1}`, 14, 82)
      doc.text(`Acompañantes: ${clientData.acompanantes || 'N/A'}`, 14, 89)
      doc.text(`Monto Total Contratado: $${clientData.monto_total}`, 14, 103)
      doc.text(`Monto Pagado Hoy (Reserva Inicial): $${amount}`, 14, 110)
      doc.setFont("helvetica", "bold")
      doc.text(`Restante por Pagar: $${clientData.restante_por_pagar}`, 14, 117)
    } else if (type === 'ABONO') {
      const deudaAnterior = clientData.restante_por_pagar + amount
      doc.text(`Monto Total del Viaje: $${clientData.monto_total}`, 14, 82)
      doc.text(`Abonos Acumulados Anteriores: $${clientData.abonos - amount}`, 14, 89)
      doc.text(`Deuda Anterior: $${deudaAnterior}`, 14, 96)
      doc.text(`Monto Abonado Hoy: $${amount}`, 14, 110)
      doc.setFont("helvetica", "bold")
      doc.text(`Deuda Actualizada: $${clientData.restante_por_pagar}`, 14, 117)
    }
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Gracias por preferir a Agencia de Viajes Beach Camp.", 105, 140, { align: 'center' })
    doc.text("¡Buen Viaje!", 105, 145, { align: 'center' })
    
    return doc.output('bloburl')
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
      const pdfUrl = generateReceiptPDF(updatedClient, 'ABONO', amount)
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

  return (
    <>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.7)', padding: '1rem 2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
        <h1 style={{color: 'var(--primary)', textShadow: '1px 1px 2px rgba(0,0,0,0.1)', margin: 0}}>Beach Camp Dashboard 🏖️</h1>
        <button onClick={async () => { await fetch('/api/auth/logout', {method:'POST'}); window.location.href='/'; }} className="btn btn-secondary" style={{background:'#e63946', color: 'white', fontWeight: 'bold'}}>Cerrar Sesión Segura</button>
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
              <label>Fecha del Viaje (DD/MM/YYYY)</label>
              <input name="fecha" type="text" maxLength={10} placeholder="DD/MM/YYYY" required value={formData.fecha} onChange={handleDateMaskDashboard}/>
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
            <button type="submit" className="btn btn-primary">Guardar Registro</button>
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
            
            <label style={{fontWeight: 'bold', color: 'var(--text)'}}>Filtrar por Destino:</label>
            <select 
              value={filterDestino} 
              onChange={(e) => setFilterDestino(e.target.value)}
              style={{padding: '0.5rem', borderRadius: '8px', border: '1px solid #90e0ef', outline: 'none'}}
            >
              <option value="Todos">Todos los destinos</option>
              {destinosUnicos.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{marginBottom: '1rem', display: 'flex', gap: '1rem'}}>
          <button onClick={exportExcel} className="btn btn-secondary" style={{background: '#2d6a4f'}}>📊 Exportar Excel</button>
          <button onClick={exportPDF} className="btn btn-secondary" style={{background: '#d00000'}}>📄 Exportar PDF</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('destino')} style={{cursor: 'pointer'}}>Destino {sortConfig.key === 'destino' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th onClick={() => handleSort('fecha')} style={{cursor: 'pointer'}}>Fecha {sortConfig.key === 'fecha' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</th>
                <th>Titular</th>
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
                  <td colSpan="8" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay registros disponibles.</td>
                </tr>
              ) : (
                paginatedClients.map(c => {
                  const pagado = c.reserva_inicial + c.abonos;
                  return (
                    <tr key={c.id}>
                      <td>{c.destino}</td>
                      <td>{new Date(c.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td>{c.nombre} {c.apellido}</td>
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
