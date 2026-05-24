import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const CITAS_POR_PAGINA = 10;

const estadoCita = (cita) => cita.estado || 'Programada';

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    const sesion = localStorage.getItem('usuarioCitas');
    return sesion ? JSON.parse(sesion) : null;
  });
  const [modoAcceso, setModoAcceso] = useState('login');
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '', cedula: '' });
  const [medicos, setMedicos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState({ nombre: '', fecha: '', hora: '' });
  const [filtros, setFiltros] = useState({ medico: '', fecha: '', paciente: '' });
  const [busquedaMedico, setBusquedaMedico] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [menuSesionAbierto, setMenuSesionAbierto] = useState(false);

  useEffect(() => {
    if (usuarioActivo) {
      obtenerMedicos();
      obtenerHistorial();
    }
  }, [usuarioActivo]);

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const obtenerMedicos = () => {
    axios.get(`${API_URL}/medicos`)
      .then(res => setMedicos(res.data))
      .catch(err => console.error('Error medicos:', err));
  };

  const obtenerHistorial = () => {
    axios.get(`${API_URL}/citas/historial/${usuarioActivo.id}`)
      .then(res => setHistorial(res.data))
      .catch(err => console.error('Error historial:', err));
  };

  const mostrarMensaje = (tipo, titulo, mensaje) => {
    setModal({ tipo, titulo, mensaje });
  };

  const cambiarCredencial = (campo, valor) => {
    const nuevoValor = campo === 'cedula' ? valor.replace(/\D/g, '').slice(0, 10) : valor;
    setCredenciales({ ...credenciales, [campo]: nuevoValor });
  };

  const enviarAcceso = (e) => {
    e.preventDefault();
    const endpoint = modoAcceso === 'login' ? 'login' : 'registro';
    const datos = modoAcceso === 'login'
      ? { usuario: credenciales.usuario, password: credenciales.password }
      : credenciales;

    axios.post(`${API_URL}/auth/${endpoint}`, datos)
      .then(res => {
        if (modoAcceso === 'registro') {
          mostrarMensaje('exito', 'Cuenta creada', 'Ahora puedes iniciar sesion con tus datos.');
          setModoAcceso('login');
          setCredenciales({ usuario: credenciales.usuario, password: '', cedula: '' });
          return;
        }

        localStorage.setItem('usuarioCitas', JSON.stringify(res.data.usuario));
        setUsuarioActivo(res.data.usuario);
        setCredenciales({ usuario: '', password: '', cedula: '' });
      })
      .catch(err => {
        mostrarMensaje(
          'alerta',
          modoAcceso === 'login' ? 'No fue posible entrar' : 'No fue posible registrar',
          err.response?.data?.error || 'Revisa los datos e intenta nuevamente.'
        );
      });
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioCitas');
    setUsuarioActivo(null);
    setSeleccionado(null);
    setHistorial([]);
    setMedicos([]);
    setMenuSesionAbierto(false);
  };

  const seleccionarMedico = (medico) => {
    setSeleccionado(medico);
    setFormulario({ nombre: usuarioActivo?.usuario || '', fecha: '', hora: '' });
    setTimeout(() => {
      document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const enviarCita = (e) => {
    e.preventDefault();
    const nuevaCita = {
      nombre_paciente: formulario.nombre,
      id_medico: seleccionado.id,
      id_usuario: usuarioActivo.id,
      fecha: formulario.fecha,
      hora: formulario.hora
    };

    axios.post(`${API_URL}/citas/agendar`, nuevaCita)
      .then(() => {
        mostrarMensaje('exito', 'Cita agendada', 'La cita fue registrada correctamente.');
        setSeleccionado(null);
        setFormulario({ nombre: '', fecha: '', hora: '' });
        obtenerHistorial();
      })
      .catch(err => {
        mostrarMensaje(
          'alerta',
          'Horario no disponible',
          err.response?.data?.error || 'No fue posible agendar la cita. Intenta nuevamente.'
        );
      });
  };

  const borrarCita = (id) => {
    if (window.confirm('¿Estas seguro de que deseas cancelar esta cita?')) {
      axios.delete(`${API_URL}/citas/${id}`, { data: { id_usuario: usuarioActivo.id } })
        .then(() => {
          mostrarMensaje('exito', 'Cita cancelada', 'La cita fue eliminada correctamente.');
          obtenerHistorial();
        })
        .catch(err => console.error('Error al borrar:', err));
    }
  };

  const citasFiltradas = useMemo(() => {
    return historial.filter(cita => {
      const medico = (cita.nombre_medico || '').toLowerCase();
      const paciente = (cita.nombre_paciente || '').toLowerCase();
      const fecha = cita.fecha ? new Date(cita.fecha).toISOString().slice(0, 10) : '';

      return (
        medico.includes(filtros.medico.toLowerCase()) &&
        paciente.includes(filtros.paciente.toLowerCase()) &&
        (!filtros.fecha || fecha === filtros.fecha)
      );
    });
  }, [historial, filtros]);

  const medicosFiltrados = useMemo(() => {
    const busqueda = busquedaMedico.toLowerCase();
    return medicos.filter(medico => {
      return (
        medico.nombre.toLowerCase().includes(busqueda) ||
        medico.especialidad.toLowerCase().includes(busqueda)
      );
    });
  }, [medicos, busquedaMedico]);

  const hoyISO = new Date().toISOString().slice(0, 10);
  const citasHoy = historial.filter(cita => {
    const fecha = cita.fecha ? new Date(cita.fecha).toISOString().slice(0, 10) : '';
    return fecha === hoyISO;
  }).length;
  const proximasCitas = historial
    .filter(cita => {
      const fecha = cita.fecha ? new Date(cita.fecha).toISOString().slice(0, 10) : '';
      return fecha >= hoyISO;
    })
    .slice(0, 3);

  const totalPaginas = Math.max(1, Math.ceil(citasFiltradas.length / CITAS_POR_PAGINA));
  const citasPagina = citasFiltradas.slice((pagina - 1) * CITAS_POR_PAGINA, pagina * CITAS_POR_PAGINA);

  const modalMarkup = modal && (
    <div className="modal-backdrop" role="presentation">
      <div className={`message-modal ${modal.tipo}`} role="alert" aria-live="assertive">
        <div className="modal-icon">{modal.tipo === 'exito' ? '✓' : '!'}</div>
        <div>
          <h3>{modal.titulo}</h3>
          <p>{modal.mensaje}</p>
        </div>
        <button onClick={() => setModal(null)} aria-label="Cerrar mensaje">
          Cerrar
        </button>
      </div>
    </div>
  );

  if (!usuarioActivo) {
    return (
      <div className="app auth-app">
        {modalMarkup}
        <main className="auth-page">
          <section className="auth-hero">
            <span className="eyebrow">UNICATOLICA Salud</span>
            <h1>Gestiona tus citas medicas desde un acceso seguro.</h1>
            <p>
              Inicia sesion o crea tu cuenta para consultar especialistas, agendar citas
              y revisar el panel de control del sistema.
            </p>
          </section>

          <section className="auth-card">
            <div className="auth-tabs">
              <button
                className={modoAcceso === 'login' ? 'active' : ''}
                onClick={() => setModoAcceso('login')}
                type="button"
              >
                Iniciar sesion
              </button>
              <button
                className={modoAcceso === 'registro' ? 'active' : ''}
                onClick={() => setModoAcceso('registro')}
                type="button"
              >
                Registrarse
              </button>
            </div>

            <form className="auth-form" onSubmit={enviarAcceso}>
              <label>
                Usuario
                <input
                  type="text"
                  required
                  value={credenciales.usuario}
                  onChange={(e) => cambiarCredencial('usuario', e.target.value)}
                />
              </label>

              {modoAcceso === 'registro' && (
                <label>
                  Cedula
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength="10"
                    required
                    value={credenciales.cedula}
                    onChange={(e) => cambiarCredencial('cedula', e.target.value)}
                  />
                </label>
              )}

              <label>
                Contrasena
                <input
                  type="password"
                  required
                  value={credenciales.password}
                  onChange={(e) => cambiarCredencial('password', e.target.value)}
                />
              </label>

              <button type="submit" className="confirm-button">
                {modoAcceso === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {modalMarkup}

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">UC</span>
          <div>
            <strong>UNICATOLICA Salud</strong>
            <span>Sistema de citas medicas</span>
          </div>
        </div>

        <div className="session-box">
          <button
            className="session-trigger"
            type="button"
            onClick={() => setMenuSesionAbierto(!menuSesionAbierto)}
            aria-expanded={menuSesionAbierto}
            aria-haspopup="menu"
          >
            <span>{usuarioActivo.usuario}</span>
          </button>

          {menuSesionAbierto && (
            <div className="profile-menu" role="dialog" aria-label="Mi perfil">
              <div className="profile-menu-header">
                <strong>Mi perfil</strong>
                <span>Sesion activa</span>
              </div>
              <dl>
                <div>
                  <dt>Usuario</dt>
                  <dd>{usuarioActivo.usuario}</dd>
                </div>
                <div>
                  <dt>Cedula</dt>
                  <dd>{usuarioActivo.cedula}</dd>
                </div>
                <div>
                  <dt>Citas registradas</dt>
                  <dd>{historial.length}</dd>
                </div>
                <div>
                  <dt>Citas de hoy</dt>
                  <dd>{citasHoy}</dd>
                </div>
              </dl>
              <button type="button" onClick={cerrarSesion}>
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">Atencion medica universitaria</span>
            <h1>Agenda tus citas medicas de forma rapida y organizada.</h1>
            <p>
              Consulta los especialistas disponibles, elige el horario que necesitas y revisa
              tus citas registradas desde un solo lugar.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#medicos">Ver medicos</a>
              <a className="button secondary" href="#citas">Panel de control</a>
            </div>
          </div>

          <aside className="summary-card">
            <span>Citas registradas</span>
            <strong>{historial.length}</strong>
            <p>Seguimiento activo del sistema</p>
          </aside>
        </section>

        <section className="dashboard-strip" aria-label="Resumen de citas">
          <article>
            <span>Citas de hoy</span>
            <strong>{citasHoy}</strong>
            <p>Agenda activa para la fecha actual</p>
          </article>
          <article>
            <span>Medicos disponibles</span>
            <strong>{medicos.length}</strong>
            <p>Especialistas cargados en el sistema</p>
          </article>
          <article>
            <span>Proximas citas</span>
            <strong>{proximasCitas.length}</strong>
            <p>Primeros registros pendientes por revisar</p>
          </article>
        </section>

        <section id="medicos" className="section-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Especialistas</span>
              <h2>Medicos disponibles</h2>
            </div>
            <p>Selecciona un medico para continuar con el formulario de agendamiento.</p>
          </div>

          <div className="doctor-search">
            <label>
              Buscar medico o especialidad
              <input
                type="search"
                value={busquedaMedico}
                onChange={(e) => setBusquedaMedico(e.target.value)}
                placeholder="Ej. Urologia, rancho, cirugia"
              />
            </label>
          </div>

          <div className="doctor-grid">
            {medicosFiltrados.map(medico => (
              <article className="doctor-card" key={medico.id}>
                <div className="doctor-avatar">{medico.nombre.charAt(0)}</div>
                <div className="doctor-info">
                  <h3>{medico.nombre}</h3>
                  <p>{medico.especialidad}</p>
                </div>
                <button onClick={() => seleccionarMedico(medico)}>Agendar cita</button>
              </article>
            ))}
          </div>
          {medicosFiltrados.length === 0 && (
            <p className="empty-table">No hay medicos que coincidan con la busqueda.</p>
          )}
        </section>

        <section id="agendar" className="appointment-area">
          {seleccionado ? (
            <div className="appointment-panel">
              <div className="form-intro">
                <span className="eyebrow">Formulario de cita</span>
                <h2>Agendar con {seleccionado.nombre}</h2>
                <p>Completa tus datos y confirma la fecha y hora de atencion.</p>
              </div>

              <form className="appointment-form" onSubmit={enviarCita}>
                <label>
                  Nombre del paciente
                  <input
                    type="text"
                    required
                    value={formulario.nombre}
                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                  />
                </label>

                <div className="form-row">
                  <label>
                    Fecha
                    <input
                      type="date"
                      required
                      value={formulario.fecha}
                      onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })}
                    />
                  </label>

                  <label>
                    Hora
                    <input
                      type="time"
                      required
                      value={formulario.hora}
                      onChange={(e) => setFormulario({ ...formulario, hora: e.target.value })}
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="confirm-button">Confirmar cita</button>
                  <button type="button" className="ghost-button" onClick={() => setSeleccionado(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="empty-selection">
              <span className="eyebrow">Agendamiento</span>
              <h2>Elige un medico para agendar</h2>
              <p>El formulario aparecera aqui cuando selecciones un especialista disponible.</p>
            </div>
          )}
        </section>

        <section id="citas" className="section-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Panel de control</span>
              <h2>Citas registradas</h2>
            </div>
            <p>Filtra y consulta las citas registradas en el sistema.</p>
          </div>

          <div className="filters-panel">
            <label>
              Medico
              <input value={filtros.medico} onChange={(e) => setFiltros({ ...filtros, medico: e.target.value })} />
            </label>
            <label>
              Fecha
              <input type="date" value={filtros.fecha} onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })} />
            </label>
            <label>
              Paciente
              <input value={filtros.paciente} onChange={(e) => setFiltros({ ...filtros, paciente: e.target.value })} />
            </label>
            <button type="button" onClick={() => setFiltros({ medico: '', fecha: '', paciente: '' })}>
              Limpiar
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Medico</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citasPagina.map(cita => (
                  <tr key={cita.id}>
                    <td>{cita.nombre_paciente}</td>
                    <td>{cita.nombre_medico}</td>
                    <td>{new Date(cita.fecha).toLocaleDateString()}</td>
                    <td>{cita.hora}</td>
                    <td><span className="status-pill">{estadoCita(cita)}</span></td>
                    <td>
                      <button className="cancel-button" onClick={() => borrarCita(cita.id)}>
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {citasFiltradas.length === 0 && (
              <p className="empty-table">No hay citas registradas con esos filtros.</p>
            )}
          </div>

          <div className="pagination">
            <span>Pagina {pagina} de {totalPaginas}</span>
            <div>
              <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <button disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

