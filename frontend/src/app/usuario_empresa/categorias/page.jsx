"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import EditForm from "../../../components/ui/EditForm/EditForm";
import styles from "./categorias.module.css"

export default function CategoriaSection() {
  const [categorias, setCategorias] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);

  const [formData, setFormData] = useState({
    id_categoria: "",
    nombre: "",
    descripcion: "",
    estado: "",
    empresa: "",
    empresa_nombre: "",
    fecha_creacion: ""
  });

  //Autenticacion
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access")
    }
    return null;
  }

  //sidebar
  const [collapsed, setCollapsed] = useState(false)

  //buscador
  const [searchTerm, setSearchTerm] = useState("")
  const filteredCategorias = categorias.filter(categoria => {
    const term = searchTerm.toLowerCase()
    return ["nombre", "estado", "empresa","empresa_nombre"].some((key) =>
      String(categoria[key]).toLowerCase().includes(term)
    );
  });

  //Obtener Categorias
  const fetchCategoria = async () => {
    const token = getToken();
    const res = await fetch("http://localhost:8000/api/categorias/mi-empresa/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("data: ", data)
    setCategorias(Array.isArray(data.categorias) ? data.categorias : []);
  };

  //formularios
  const handleCategoriaFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOpenCategoriaForm = () => {
    fetchCategoria();
    setShowCategoriaForm(true);
  };
  const handleCloseCategoriaForm = () => {
    setShowCategoriaForm(false);
    setFormData({ id_categoria: "", nombre: "", descripcion: "", estado: "", empresa: "", empresa_nombre: "", fecha_creacion: ""})
  }

  //ver desde el inicio las categorias
  useEffect(() => {
    fetchCategoria();
  }, []);

  // Agregar Categoria
  const handleAgregarCategoria = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error ("No Autenticado");

      const res = await fetch(
        "http://localhost:8000/api/categorias/crear/",
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`, "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
          }),
        }
      );

      const data = await res.json();

      if(res.ok) {
        alert("Categoria registrada exitosamente")
        handleCloseCategoriaForm();
        fetchCategoria();
      } else {
        alert(data.detail || data.error || "Error desconocido")
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar la Categoria");
    }
  };

  //Eliminar Categoria
  const deleteCategoria = async (id) => {
    if (!confirm("¿Eliminar Categoria?")) return;

    try {
        const token = getToken();
        if (!token) throw new Error("No autenticado")
        
        const res = await fetch(`http://localhost:8000/api/categorias/${id}/gestion/`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
            setCategorias(prev => prev.filter(p => p.id_categoria !== id));
            alert("Categoria eliminada Correctamente");
        } else {
            const data = await res.json();
            alert(data.detail || data.error || "Error al eliminar la categoria");
        }
    } catch (err) {
        console.error(err);
        alert("Error al eliminar la categoria");
    }
  }

  //tabla
  const columns = [
    { label: "Nombre", key: "nombre" },
    { label: "Descripción", key: "descripcion" },
    { label: "Estado", key: "estado" },
    { label: "Empresa", key: "empresa" },
    { label: "Nombre de la Empresa", key: "empresa_nombre" },
    { label: "Fecha Creacion", key: "fecha_creacion" },
  ]

  //Editar Categoria
  const [editForm, setEditForm] = useState({});
  const [editingCategoria, setEditingCategoria] = useState(null);
  
  const renderActions = (row) => (
  <ActionMenu
    id={row.id_categoria}
    estado={row.estado}
    onEliminar={() => deleteCategoria(row.id_categoria)}
    onEditar={() => {
      setEditingCategoria(row);
      setFormData({
        nombre: row.nombre,
        descripcion: row.descripcion,
      });
    }}
  />
);

  /* ====== UI ====== */
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}> Gestion de Categorias</h1>

        {/* Categorias */}
        <div className={styles.section}>
          <div>
            <h2>Categorias ({filteredCategorias.length})</h2>
            <div className={styles.headerActions}>
              <Button onClick={handleOpenCategoriaForm} variant="secondary">
                + Agregar Categoria
              </Button>
            </div>
          </div>

          {loading && <p>Cargando categorias...</p>}
          {error && <p className={styles.errorText}>{error}</p>}

          <SearchBar
            searchTerm={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar categorias por nombre, estado, empresa..."
            fullWidth={true}
          />

          <Tables
            columns={columns}
            data={filteredCategorias}
            renderActions={renderActions}
            rowKey="id_categoria"
          />

          {/* Modal Agregar Categoria */}
          {showCategoriaForm && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3>Registrar nueva Categoria</h3>
                </div>
                <form onSubmit={handleAgregarCategoria}>
                  <FormField
                    type="text"
                    name="nombre"
                    label="Nombre de la Categoria"
                    placeholder="Nombre de la Categoria"
                    value={formData.nombre}
                    onChange={handleCategoriaFormChange}
                    required
                  />
                  <FormField
                    type="text"
                    name="descripcion"
                    label="Descripcion"
                    placeholder="Maximo 250 caracteres"
                    value={formData.descripcion}
                    onChange={handleCategoriaFormChange}
                  />
                  
                  <div className={styles.modalActions}>
                    <Button type="submit" variant="primary">Guardar</Button>
                    <Button type="button" variant="secondary" onClick={handleCloseCategoriaForm}>Cancelar</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Editar Categoria */}
          {editingCategoria && (
            <EditForm
              data={formData}
              fields={[
                { name: "nombre", label: "Nombre Categoria" },
                { name: "descripcion", label: "Descripcion" },
              ]}
              onSave={async (updatedData) => {
                try {
                  const token = getToken();
                  const res = await fetch(`http://localhost:8000/api/categorias/${editingCategoria.id_categoria}/gestion/`, {
                    method: "PATCH",
                    headers: { 
                      Authorization: `Bearer ${token}`, 
                      "Content-Type": "application/json" 
                    },
                    body: JSON.stringify({
                      nombre: updatedData.nombre,
                      descripcion: updatedData.descripcion,
                    }),
                  });

                  const data = await res.json();
                  console.log("Response data:", data);
                  if (res.ok) {
                    alert("Categoria actualizada exitosamente");
                    setEditingCategoria(null);
                    setFormData({
                      nombre: "",
                      descripcion: "",
                    });
                    fetchCategoria();
                  } else {
                    alert(data.detail || data.error || "Error al actualizar");
                  }
                } catch (err) {
                  console.error(err);
                  alert("Error al actualizar la categorias");
                }
              }}
              onCancel={() => {
                setEditingCategoria(null);
                setFormData({
                  nombre: "",
                  descripcion: "",
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}