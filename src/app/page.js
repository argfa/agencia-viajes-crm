'use client'

import { useState, useEffect } from 'react'

export default function LoginPage() {
  // Anti-BFCache: Forzar recarga si se usa el botón Atrás
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const [isLogin, setIsLogin] = useState(true)
  
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  
  // Direccion separada
  const [ciudad, setCiudad] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [parroquia, setParroquia] = useState('')
  const [urbanizacion, setUrbanizacion] = useState('')
  
  const [email, setEmail] = useState('')
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Ojo de contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const resetFields = () => {
    setCedula('')
    setPassword('')
    setConfirmPassword('')
    setNombre('')
    setFechaNacimiento('')
    setCiudad('')
    setMunicipio('')
    setParroquia('')
    setUrbanizacion('')
    setEmail('')
    setError('')
    setSuccess('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const toggleMode = () => {
    resetFields()
    setIsLogin(!isLogin)
  }

  const handleCedulaChange = (e, setter) => {
    setter(e.target.value.replace(/\D/g, ''))
  }

  // Mascara DD/MM/YYYY
  const handleDateMask = (e, setter) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length >= 5) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4) + '/' + val.substring(4, 8)
    } else if (val.length >= 3) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4)
    }
    setter(val)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, password })
    })
    
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      const data = await res.json()
      setError(data.error || 'Credenciales inválidas')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (fechaNacimiento.length !== 10) {
      setError('Recuerde que el formato de fecha debe ser estrictamente DD/MM/YYYY')
      return;
    }

    const direccionCompleta = `Ciudad: ${ciudad}, Municipio: ${municipio}, Parroquia: ${parroquia}, Urb: ${urbanizacion}`

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nombre: nombre.toUpperCase(), 
        cedula, 
        fecha_nacimiento: fechaNacimiento, 
        direccion: direccionCompleta.toUpperCase(), 
        email: email.toLowerCase(), 
        password 
      })
    })
    
    if (res.ok) {
      setSuccess('Agente registrado con éxito. Ahora puedes Iniciar Sesión.')
      setTimeout(() => {
        setIsLogin(true)
        resetFields()
      }, 1500)
    } else {
      const data = await res.json()
      setError(data.error || 'Error al registrar el agente')
    }
  }

  return (
    <div style={{minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
      <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
        <p style={{color: 'var(--primary)', fontSize: '1.3rem', fontWeight: 'bold'}}>Portal de Agentes Autorizados</p>
      </div>

      <div className="glass-card" style={{width: '100%', maxWidth: isLogin ? '450px' : '550px', padding: '2.5rem', transition: 'max-width 0.3s ease'}}>
        <h2 style={{textAlign: 'center', color: 'var(--primary)', marginBottom: '1.5rem'}}>
          {isLogin ? 'Acceso al Sistema' : 'Registro de Personal'}
        </h2>
        
        {error && <div style={{background: '#ffccd5', color: '#c9184a', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold'}}>{error}</div>}
        {success && <div style={{background: '#d8f3dc', color: '#2d6a4f', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold'}}>{success}</div>}

        {isLogin ? (
          <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="input-group">
              <label>Cédula de Identidad (Usuario)</label>
              <input type="text" required value={cedula} onChange={e => handleCedulaChange(e, setCedula)} placeholder="Ej. 12345678" style={{padding: '0.6rem'}} />
            </div>
            <div className="input-group">
              <label>Contraseña</label>
              <div style={{display:'flex', width:'100%', position: 'relative'}}>
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} style={{padding: '0.6rem', flex: 1, paddingRight: '40px'}} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}} title={showPassword ? "Ocultar" : "Mostrar"}>
                  {showPassword ? '👁️' : '🔐'}
                </button>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{marginTop: '1rem', width: '100%', padding: '0.8rem', fontSize: '1.1rem'}}>Ingresar de Forma Segura</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div className="input-group">
              <label>Nombre y Apellido</label>
              <input type="text" required value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())} placeholder="Todo en mayúsculas" />
            </div>
            
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                <label>Cédula de Identidad</label>
                <input type="text" required value={cedula} onChange={e => handleCedulaChange(e, setCedula)} placeholder="Sin puntos" />
              </div>
              <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                <label>Fecha Nacimiento</label>
                <input type="text" required value={fechaNacimiento} onChange={e => handleDateMask(e, setFechaNacimiento)} placeholder="DD/MM/YYYY" maxLength={10} />
              </div>
            </div>

            <div className="input-group">
              <label>Correo Electrónico de Contacto</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            
            <fieldset style={{border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem'}}>
              <legend style={{fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', padding: '0 5px'}}>Dirección Detallada</legend>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
                <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Ciudad</label>
                  <input type="text" required value={ciudad} onChange={e => setCiudad(e.target.value)} />
                </div>
                <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Municipio</label>
                  <input type="text" required value={municipio} onChange={e => setMunicipio(e.target.value)} />
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Parroquia</label>
                  <input type="text" required value={parroquia} onChange={e => setParroquia(e.target.value)} />
                </div>
                <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Urbanización</label>
                  <input type="text" required value={urbanizacion} onChange={e => setUrbanizacion(e.target.value)} />
                </div>
              </div>
            </fieldset>

            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                <label>Crear Contraseña</label>
                <div style={{display:'flex', width:'100%', position: 'relative'}}>
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 cat, 1 May, 1 Símb" style={{flex: 1, paddingRight: '40px'}} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}} title={showPassword ? "Ocultar" : "Mostrar"}>
                    {showPassword ? '👁️' : '🔐'}
                  </button>
                </div>
              </div>
              <div className="input-group" style={{flex: 1, minWidth: '150px'}}>
                <label>Confirmar Contraseña</label>
                <div style={{display:'flex', width:'100%', position: 'relative'}}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      flex: 1, 
                      paddingRight: '40px',
                      ...(password && confirmPassword && password === confirmPassword ? { borderColor: 'var(--success)', borderWidth: '2px' } : {})
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}
                    title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showConfirmPassword ? '👁️' : '🔐'}
                  </button>
                </div>
                {password && confirmPassword && password === confirmPassword && (
                  <div style={{position: 'relative'}}>
                    <p style={{color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '0.2rem', position: 'absolute'}}>✓ Las contraseñas coinciden</p>
                  </div>
                )}
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{marginTop: '1rem', width: '100%', background: '#2d6a4f', border: '1px solid #1b4332'}}>Inscribir Agente al Sistema</button>
          </form>
        )}

        <div style={{marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1.5rem'}}>
          <button type="button" onClick={toggleMode} style={{background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold'}}>
             {isLogin ? '¿Nuevo usuario? Regístrate aquí' : '‹ Volver a pantalla de Acceso y cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}
