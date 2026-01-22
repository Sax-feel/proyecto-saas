"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import styles from "./vendedor.module.css"
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import Notification from "../../../components/ui/notificacion/notificacion"

export default function DashboardVendedor(){
    const [vendedores, setVendedores] = useState([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [collapsed, setCollapsed] = useState(false)

    //Autenticacion
    const getToken = () => {
        if (typeof window !== "undefined") {
        return localStorage.getItem("access")
        }
        return null;
    }

    //Registrar Vendedor
    const handleRegistrarVendedor  = async (e) => {
        e.preventDefault();

        try {
            const token = getToken();
            if (!token) throw new Error("No autenticado");

            const res = await fetch(
            "http://localhost:8000/api/usuarios-empresa/registrar/",
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                rol_nombre: "vendedor",
                }),
            }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error al registrar");

            showNotification("Vendedor registrado correctamente", "success");

            setShowVendedorForm(false);
            setFormData({ email: "", password: "" });

            fetchVendedores(); // 🔄 recargar lista
        } catch (err) {
            showNotification(err.message, "error");
        }
        };

    //estado VEndedores
    const [showVendedorForm, setShowVendedorForm] = useState(false);

    const [formData, setFormData] = useState({
    email: "",
    password: "",
    });

    //formulario
    const handleFormChange = (e) => {
    setFormData({
        ...formData,
        [e.target.name]: e.target.value,
    });
    };


    //TABLAS
    const columns = [
        { label: "Email", key: "email" },
        { label: "Rol", key: "rol_nombre" },
    ]

    return(
        <div className={styles.dashboardContainer}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
          <h1 className={styles.title}> Listado de Vendedores</h1>
            <Button onClick={() => setShowVendedorForm(true)}>
                + Registrar Vendedor
            </Button>
          <section className={styles.section}>
            <div>
              <h2>Vendedores</h2>
              <div className={styles.headerActions}>
              </div>
            </div>

            <Tables
                columns={columns}
                data={vendedores}
                rowKey="id"
            />

            {showVendedorForm && (
            <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                <h3>Registrar Vendedor</h3>

                <form onSubmit={handleRegistrarVendedor}>
                    <FormField
                    type="email"
                    name="email"
                    label="Email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    />

                    <FormField
                    type="password"
                    name="password"
                    label="Contraseña"
                    value={formData.password}
                    onChange={handleFormChange}
                    required
                    />

                    <div className={styles.modalActions}>
                    <Button type="submit">Guardar</Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowVendedorForm(false)}
                    >
                        Cancelar
                    </Button>
                    </div>
                </form>
                </div>
            </div>
            )}
        </section>
        </div>
        </div>
    )
}