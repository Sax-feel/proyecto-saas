
import CatalogoEmpresa from "../../../components/catalogo/CatalogoEmpresa";

export default async function CatalogoPage({ params }) {
    const { id } = await params;
    return <CatalogoEmpresa empresaId={id} />;
}