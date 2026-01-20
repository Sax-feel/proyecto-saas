import { notFound } from 'next/navigation';

export default function EmpresaDetailPage({ params }) {
    // Por ahora solo mostramos una página básica
    // que luego desarrollaremos completamente
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Detalles de la Empresa (ID: {params.id})</h1>
            <p>Esta página está en desarrollo.</p>
            <p>Aquí se mostrarán todos los detalles específicos de la empresa.</p>
        </div>
    );
}

export async function generateStaticParams() {
    // Opcional: Generar rutas estáticas si conoces los IDs
    return [];
}