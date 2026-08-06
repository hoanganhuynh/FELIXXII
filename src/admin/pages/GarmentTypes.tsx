import { useTranslation } from "react-i18next";
import { listGarmentTypes, upsertGarmentType, deleteGarmentType } from "../api/taxonomy";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../../store/auth";
import TaxonomyList from "../components/TaxonomyList";

export default function AdminGarmentTypes() {
  const { t } = useTranslation();
  const { isAdmin, ready } = useAuth();
  const types = useAsync(() => listGarmentTypes(), [], []);

  return (
    <TaxonomyList
      title={t("garmentTypesPage.title")}
      subtitle={t("garmentTypesPage.subtitle")}
      rows={types.data}
      loading={types.loading}
      readOnly={ready && !isAdmin}
      newLabel={t("garmentTypesPage.new")}
      onSave={async (row, isNew) => {
        await upsertGarmentType(row);
        types.reload();
        void isNew;
      }}
      onDelete={async (row) => {
        await deleteGarmentType(row.id);
        types.reload();
      }}
    />
  );
}
