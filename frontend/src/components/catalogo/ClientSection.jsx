// frontend/src/components/catalogo/ClientSection.jsx
'use client';

import { useState } from 'react';
import ClientNITSearch from './ClientNITSearch';
import styles from './CartContent.module.css'; // Usamos los mismos estilos

export default function ClientSection({ 
    empresaId, 
    selectedClient, 
    onClientSelect,
    onEditClient 
}) {
    const [showClientSearch, setShowClientSearch] = useState(true);

    return (
        <div className={styles.clientSection}>
            <h3 className={styles.clientSectionTitle}>
                Cliente {selectedClient ? 'Seleccionado' : 'por Atender'}
            </h3>

            {selectedClient ? (
                <div className={styles.selectedClientCard}>
                    <div className={styles.clientCardHeader}>
                        <h4>Cliente Seleccionado ✓</h4>
                        <button
                            onClick={onEditClient}
                            className={styles.editClientButton}
                        >
                            Cambiar
                        </button>
                    </div>
                    <div className={styles.clientDetailsGrid}>
                        <div className={styles.clientDetail}>
                            <span className={styles.detailLabel}>NIT: 
                                <span className={styles.detailValue}> {selectedClient.nit}</span>
                            </span>
                        </div>
                        <div className={styles.clientDetail}>
                            <span className={styles.detailLabel}>Nombre:
                                <span className={styles.detailValue}> {selectedClient.nombre_cliente}</span>
                            </span>
                        </div>
                        <div className={styles.clientDetail}>
                            <span className={styles.detailLabel}>Teléfono:
                                <span className={styles.detailValue}> {selectedClient.telefono_cliente || 'No registrado'}</span>
                            </span>
                        </div>
                        <div className={styles.clientDetail}>
                            <span className={styles.detailLabel}>Dirección:
                                <span className={styles.detailValue}> {selectedClient.direccion_cliente || 'No registrado'}</span>
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.clientSearchArea}>
                    {showClientSearch && (
                        <ClientNITSearch
                            empresaId={empresaId}
                            onClientSelect={onClientSelect}
                        />
                    )}
                </div>
            )}
        </div>
    );
}