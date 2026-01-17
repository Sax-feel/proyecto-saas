"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import EmpresaCard from "../../components/cliente/EmpresaSelector/EmpresaCard";
import LoadingSpinner from "../../components/cliente/EmpresaSelector/LoadingSpinner";
import EmptyState from "../../components/cliente/EmpresaSelector/EmptyState";
import styles from "./DashboardCliente.module.css";

export default function ClientePage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmpresasCliente = async () => {
      // Validar sesión
      const access = localStorage.getItem("access");
      const rol = localStorage.getItem("rol");

      if (!access || rol !== "cliente") {
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        
        // Obtener empresas del cliente
        const response = await fetch("http://localhost:8000/api/clientes/mis-empresas/", {
          headers: {
            "Authorization": `Bearer ${access}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          // Token expirado
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("rol");
          router.push("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Error al cargar empresas");
        }

        // Si la API devuelve un array directamente
        if (Array.isArray(data)) {
          setEmpresas(data);
        } 
        // Si la API devuelve un objeto con empresas
        else if (data.empresas) {
          setEmpresas(data.empresas);
        }
        // Si no hay empresas, dejar array vacío
        else {
          setEmpresas([]);
        }

      } catch (err) {
        console.error("Error cargando empresas:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresasCliente();
  }, [router]);

  // Si hay error
  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Mis Empresas</h1>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mis Empresas</h1>
        <p className={styles.subtitle}>
          Selecciona una empresa para ver sus productos y realizar pedidos
        </p>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <LoadingSpinner />
      ) : empresas.length === 0 ? (
        <EmptyState />
      ) : (
        <>

          {/* Lista de empresas en tarjetas */}
          <div className={styles.empresasGrid}>
            {empresas.map((empresa) => (
              <EmpresaCard key={empresa.id_empresa} empresa={empresa} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}